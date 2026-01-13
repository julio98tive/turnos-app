
// Este es un script de un solo uso para restablecer la contraseña del administrador (versión ES Module).
import admin from 'firebase-admin';

// La configuración de inicialización se obtiene del entorno de ejecución.
try {
  admin.initializeApp();
} catch (e) {
  // Es posible que ya esté inicializada, lo ignoramos.
}

const adminEmail = 'admin@turnos.com';
const newPassword = 'Ticline.2025*';

async function resetAdminPassword() {
  try {
    console.log(`Buscando usuario con el email: ${adminEmail}...`);
    const user = await admin.auth().getUserByEmail(adminEmail);
    
    console.log(`Usuario encontrado con UID: ${user.uid}. Actualizando contraseña...`);
    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });
    
    console.log('¡Éxito! La contraseña para admin@turnos.com ha sido actualizada.');
    console.log('Ahora puedes iniciar sesión con la nueva contraseña.');

  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    // Salimos con un código de error para que la terminal lo detecte.
    process.exit(1); 
  }
}

resetAdminPassword();
