
import { httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, functions } from '../firebase'; // Asumiendo que esta es la ruta correcta

/**
 * ATENCIÓN: Este script solo debe ser ejecutado por un administrador autenticado.
 * Restablece la contraseña de la cuenta 'admin@turnos.com'.
 * 
 * Para usarlo:
 * 1. Inicia sesión en la aplicación con una cuenta de administrador.
 * 2. Llama a esta función desde algún lugar de la UI (ej. un botón temporal).
 * 3. Revisa la consola del navegador para ver el resultado.
 * 4. ¡Elimina el botón y este script una vez que hayas terminado!
 */
export const resetAdminPassword = async () => {
  const newPassword = "Ticline.2025*";
  const adminEmail = "admin@turnos.com";

  console.log("Iniciando el proceso para restablecer la contraseña...");

  try {
    // 1. Encontrar el UID del usuario admin
    console.log(`Buscando el UID para el email: ${adminEmail}`);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", adminEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error("Error: No se encontró un usuario con el email 'admin@turnos.com'.");
      alert("Error: No se encontró el usuario admin.");
      return;
    }

    const adminUserDoc = querySnapshot.docs[0];
    const adminUid = adminUserDoc.id;
    console.log(`UID encontrado: ${adminUid}`);

    // 2. Llamar a la Cloud Function para cambiar la contraseña
    console.log("Llamando a la función 'resetPassword'...");
    const resetPasswordFunc = httpsCallable(functions, 'resetPassword');
    
    // El UID del admin que hace la llamada se obtiene automáticamente en el backend
    const result = await resetPasswordFunc({ uid: adminUid, newPassword: newPassword });

    console.log("Respuesta de la función:", result.data);
    alert("¡Éxito! La contraseña de 'admin@turnos.com' ha sido actualizada.");

  } catch (error) {
    console.error("Error al restablecer la contraseña:", error);
    alert("Hubo un error al restablecer la contraseña. Revisa la consola para más detalles.");
  }
};
