'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin app, ensuring it's only done once.
 * @returns {App} The initialized Firebase Admin App.
 */
function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Use a more reliably loaded environment variable for server actions.
  const adminConfigString = process.env.FIREBASE_ADMIN_CONFIG;

  if (!adminConfigString) {
    throw new Error(
      'La variable de entorno FIREBASE_ADMIN_CONFIG no está configurada. ' +
      'Por favor, copia el contenido de tu archivo JSON de credenciales de servicio ' +
      'y pégalo en esa variable dentro de tu archivo .env.local.'
    );
  }

  try {
    const serviceAccount = JSON.parse(adminConfigString);
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e: any) {
    console.error("Error parsing FIREBASE_ADMIN_CONFIG:", e.message);
    throw new Error(
      'El valor de FIREBASE_ADMIN_CONFIG no es un JSON válido. ' +
      'Asegúrate de haber copiado todo el contenido del archivo de credenciales.'
    );
  }
}

/**
 * A server action to create a new user in Firebase Authentication.
 * This should only be called from a secure context (e.g., an admin dashboard).
 * @param {string} email - The email for the new user.
 * @param {string} password - The password for the new user.
 * @returns {Promise<{ uid?: string, error?: { code: string; message: string } }>} An object with the new user's UID or an error object.
 */
export async function createUserAction(email: string, password: string): Promise<{ uid?: string, error?: { code: string; message: string } }> {
  try {
    // Ensure the admin app is initialized.
    initializeAdminApp();
    const auth = getAuth();
    
    // Create the user in Firebase Authentication.
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: false, // You can change this if you send a verification email.
    });
    
    // Return the UID on success.
    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating user (Server Action):', error);
    
    // Return a simplified error object for the client.
    // The client can then check for specific error codes like 'auth/email-already-in-use'.
    return { error: { code: error.code || 'unknown', message: error.message || 'An unexpected server error occurred.' } };
  }
}
