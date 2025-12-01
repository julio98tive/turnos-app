import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";

// eslint-disable-next-line max-len
admin.initializeApp(); // Tuve que deshabilitar el linter aquí por errores.
setGlobalOptions({region: "us-central1"});

const VALID_ROLES = ["ADMIN", "INGENIERO", "AGENTE"];

/**
 * Registra un nuevo usuario (v2).
 * Requiere rol de administrador.
 */
export const registerUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticación requerida.");
  }

  const adminDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();
  // eslint-disable-next-line max-len
  if (adminDoc.data()?.role !== "ADMIN") { // Y aquí también, por la misma razón.
    throw new HttpsError("permission-denied", "Solo para administradores.");
  }

  const {email, password, role, fullName} = request.data;
  if (!email || !password || !role || !fullName) {
    throw new HttpsError("invalid-argument", "Faltan datos requeridos.");
  }

  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `Rol no válido: ${role}.`);
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email: email,
      role: role,
      fullName: fullName,
    });

    return {uid: userRecord.uid, message: "Usuario creado con éxito."};
  } catch (error: unknown) {
    const isFirebaseError = (err: unknown): err is { code: string } => {
      return typeof err === "object" && err !== null && "code" in err;
    };

    if (isFirebaseError(error) && error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "El email ya está en uso.");
    }

    logger.error("Error al registrar el usuario:", error);
    throw new HttpsError("internal", "Error interno del servidor.");
  }
});
