'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';

// Configuración de Firebase Admin
// Es importante que las credenciales de servicio estén configuradas como variables de entorno
// en el servidor (por ejemplo, GOOGLE_APPLICATION_CREDENTIALS).
const adminConfig = {
  // projectId, clientEmail, privateKey se toman de las variables de entorno
};

// Inicializa la app de Firebase Admin solo si no existe una ya
function initializeAdminApp(): App {
  if (getApps().length === 0) {
    return initializeApp(adminConfig);
  }
  return getApps()[0];
}

export async function createUserAction(email: string, password: string): Promise<{ uid?: string, error?: { code: string; message: string } }> {
  try {
    initializeAdminApp();
    const auth = getAuth();
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false, // Puedes cambiar esto si envías un correo de verificación
    });
    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error al crear usuario (Server Action):', error);
    // Devuelve un objeto de error simplificado para el cliente
    return { error: { code: error.code || 'unknown', message: error.message || 'Ocurrió un error inesperado en el servidor.' } };
  }
}
