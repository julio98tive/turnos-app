import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";

// Inicializar Firebase Admin
admin.initializeApp();

const app = express();

// Configurar CORS
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://tu-app.vercel.app",
  ],
  credentials: true,
}));

app.use(express.json());

// Función para crear usuario en Firestore si no existe
const createUserIfNotExists = async (userId: string, userEmail: string) => {
  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      const userName = userEmail?.split('@')[0] || 'Usuario';
      
      const userData = {
        email: userEmail,
        name: userName,
        role: 'agente',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await admin.firestore().collection("users").doc(userId).set(userData);
      console.log(`✅ Usuario creado automáticamente: ${userEmail}`);
    }
  } catch (error) {
    console.error('❌ Error creando usuario automáticamente:', error);
  }
};

// Middleware para autenticación
const authenticate = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({error: "No token provided"});
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;

    // CREAR USUARIO AUTOMÁTICAMENTE SI NO EXISTE
    await createUserIfNotExists(decodedToken.uid, decodedToken.email || '');

    // Obtener datos del usuario desde Firestore
    const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.userData = userDoc.data();
    } else {
      req.userData = {
        role: "agente", 
        email: decodedToken.email,
        name: decodedToken.email?.split('@')[0] || 'Usuario'
      };
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({error: "Invalid token"});
  }
};

// Ruta de salud - pública
app.get("/health", (req: any, res: any) => {
  res.json({
    status: "OK",
    message: "API de Turnos funcionando",
    timestamp: new Date().toISOString(),
  });
});

// OBTENER TURNOS - Protegido
// OBTENER TURNOS - Protegido
app.get("/shifts", authenticate, async (req: any, res: any) => {
  try {
    const userRole = req.userData?.role || "agente";
    let query: admin.firestore.Query | admin.firestore.CollectionReference = admin.firestore().collection("shifts");

    console.log(`🔍 Obteniendo turnos para rol: ${userRole}`);

    // Filtrar por rol del usuario
    if (userRole === "agente") {
      query = query.where("role", "==", "agente");
    } else if (userRole === "ingeniero") {
      query = query.where("role", "==", "ingeniero");
    }
    // Admin ve todos los turnos sin filtro

    const snapshot = await query.orderBy("date", "desc").get();
    const shifts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date,
        userName: data.userName,
        email: data.email,
        shiftType: data.shiftType,
        role: data.role,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    console.log(`✅ Encontrados ${shifts.length} turnos para ${userRole}`);

    res.json(shifts);
  } catch (error) {
    console.error("❌ Error fetching shifts:", error);
    res.status(500).json({error: "Error al obtener los turnos"});
  }
});

// CREAR TURNO - Solo admin
app.post("/shifts", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    const {date, userName, email, shiftType, role} = req.body;

    // Validar datos requeridos
    if (!date || !userName || !email || !shiftType || !role) {
      return res.status(400).json({error: "Faltan campos requeridos"});
    }

    const shiftData = {
      date,
      userName,
      email,
      shiftType,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection("shifts").add(shiftData);

    console.log(`✅ Turno creado: ${docRef.id} para ${userName}`);

    res.json({
      id: docRef.id,
      message: "Turno creado exitosamente",
      shift: shiftData,
    });
  } catch (error) {
    console.error("❌ Error creating shift:", error);
    res.status(500).json({error: "Error al crear el turno"});
  }
});

// OBTENER TODOS LOS USUARIOS - Solo admin
app.get("/users", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    const snapshot = await admin.firestore().collection("users").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name,
        role: data.role,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    console.log(`✅ Obtenidos ${users.length} usuarios`);

    res.json(users);
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    res.status(500).json({error: "Error al obtener los usuarios"});
  }
});

// OBTENER USUARIO POR ID - Solo admin
app.get("/users/:userId", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    const {userId} = req.params;
    const userDoc = await admin.firestore().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({error: "Usuario no encontrado"});
    }

    const userData = userDoc.data();
    const userResponse = {
      id: userDoc.id,
      email: userData?.email,
      name: userData?.name,
      role: userData?.role,
      isActive: userData?.isActive,
      createdAt: userData?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: userData?.updatedAt?.toDate?.()?.toISOString() || null,
    };

    console.log(`✅ Usuario obtenido: ${userResponse.email}`);

    res.json(userResponse);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({error: "Error al obtener el usuario"});
  }
});

// ACTUALIZAR ROL DE USUARIO - Solo admin
app.put("/users/:userId/role", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    const {userId} = req.params;
    const {role} = req.body;

    if (!["admin", "agente", "ingeniero"].includes(role)) {
      return res.status(400).json({error: "Rol inválido. Use: admin, agente o ingeniero"});
    }

    // Verificar que el usuario existe
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({error: "Usuario no encontrado"});
    }

    const updateData = {
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("users").doc(userId).update(updateData);

    console.log(`✅ Rol actualizado: usuario ${userId} -> ${role}`);

    res.json({
      message: "Rol de usuario actualizado exitosamente",
      userId,
      newRole: role,
    });
  } catch (error) {
    console.error("❌ Error updating user role:", error);
    res.status(500).json({error: "Error al actualizar el rol del usuario"});
  }
});

// DESACTIVAR/ACTIVAR USUARIO - Solo admin
app.put("/users/:userId/status", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    const {userId} = req.params;
    const {isActive} = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({error: "El campo isActive debe ser true o false"});
    }

    // Verificar que el usuario existe
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({error: "Usuario no encontrado"});
    }

    const updateData = {
      isActive: isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection("users").doc(userId).update(updateData);

    console.log(`✅ Estado actualizado: usuario ${userId} -> ${isActive ? 'activo' : 'inactivo'}`);

    res.json({
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      userId,
      isActive: isActive
    });
  } catch (error) {
    console.error("❌ Error updating user status:", error);
    res.status(500).json({error: "Error al actualizar el estado del usuario"});
  }
});

// ACTUALIZAR PERFIL DE USUARIO - El propio usuario o admin
app.put("/users/:userId/profile", authenticate, async (req: any, res: any) => {
  try {
    const {userId} = req.params;
    const {name} = req.body;

    // Verificar permisos: el usuario solo puede editar su propio perfil, admin puede editar cualquier perfil
    if (req.user.uid !== userId && req.userData?.role !== "admin") {
      return res.status(403).json({error: "No tienes permisos para editar este perfil"});
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({error: "El nombre es requerido"});
    }

    // Verificar que el usuario existe
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({error: "Usuario no encontrado"});
    }

    const updateData: any = {
      name: name.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Solo admin puede cambiar el email
    if (req.userData?.role === "admin" && req.body.email) {
      updateData.email = req.body.email;
    }

    await admin.firestore().collection("users").doc(userId).update(updateData);

    console.log(`✅ Perfil actualizado: usuario ${userId}`);

    res.json({
      message: "Perfil actualizado exitosamente",
      userId,
      updates: updateData
    });
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    res.status(500).json({error: "Error al actualizar el perfil del usuario"});
  }
});

// RUTA PARA REGISTRAR USUARIO MANUALMENTE - Solo admin
app.post("/register-user", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    const {email, role = 'agente', name} = req.body;

    if (!email) {
      return res.status(400).json({error: "Email es requerido"});
    }

    // Verificar si el email ya existe en Firestore
    const existingUser = await admin.firestore()
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!existingUser.empty) {
      return res.status(400).json({error: "El email ya está registrado"});
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: "Temporal123", // Contraseña temporal
      disabled: false,
    });

    // Crear documento en Firestore
    const userName = name || email.split('@')[0] || 'Usuario';
    const userData = {
      email: email,
      name: userName,
      role: role,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    console.log(`✅ Usuario registrado manualmente: ${email}`);

    res.json({
      message: "Usuario creado exitosamente",
      userId: userRecord.uid,
      email: email,
      name: userName,
      role: role,
      temporaryPassword: "Temporal123" // En producción, enviar por email seguro
    });
  } catch (error) {
    console.error("❌ Error registrando usuario:", error);
    res.status(500).json({error: "Error al registrar el usuario"});
  }
});

// OBTENER ESTADÍSTICAS - Solo admin
app.get("/dashboard/stats", authenticate, async (req: any, res: any) => {
  try {
    if (req.userData?.role !== "admin") {
      return res.status(403).json({error: "Se requiere acceso de administrador"});
    }

    // Obtener conteo de usuarios
    const usersSnapshot = await admin.firestore().collection("users").get();
    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => doc.data().isActive !== false).length;

    // Obtener conteo de turnos
    const shiftsSnapshot = await admin.firestore().collection("shifts").get();
    const totalShifts = shiftsSnapshot.size;

    // Obtener usuarios por rol
    const usersByRole = {
      admin: usersSnapshot.docs.filter(doc => doc.data().role === 'admin').length,
      agente: usersSnapshot.docs.filter(doc => doc.data().role === 'agente').length,
      ingeniero: usersSnapshot.docs.filter(doc => doc.data().role === 'ingeniero').length,
    };

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: usersByRole
      },
      shifts: {
        total: totalShifts
      },
      updatedAt: new Date().toISOString()
    };

    console.log(`✅ Estadísticas obtenidas: ${totalUsers} usuarios, ${totalShifts} turnos`);

    res.json(stats);
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({error: "Error al obtener las estadísticas"});
  }
});

// Exportar la API como Firebase Function
export const api = functions.https.onRequest(app);