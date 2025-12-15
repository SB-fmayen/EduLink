'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin app, ensuring it's only done once.
 * @returns {App} The initialized Firebase Admin App.
 */
function initializeAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const credentialJsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialJsonString) {
    throw new Error(
      "La variable de entorno GOOGLE_APPLICATION_CREDENTIALS_JSON no está configurada. " +
      "Por favor, copia el contenido de tu archivo JSON de credenciales de servicio en la variable " +
      "dentro de tu archivo '.env.local'."
    );
  }

  try {
    const credential = cert(JSON.parse(credentialJsonString));
     return initializeApp({
      credential,
    });
  } catch (e) {
     throw new Error(
      "El valor de GOOGLE_APPLICATION_CREDENTIALS_JSON no es un JSON válido. " +
      "Asegúrate de copiar todo el contenido del archivo de credenciales y no solo la ruta."
    );
  }
}


interface NewUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  schoolId: string;
  role: 'student';
}

/**
 * Server action for user self-registration.
 * Creates a user in Firebase Auth and their profile document in Firestore.
 * @param {string} email - The user's email.
 * @param {string} password - The user's password.
 * @param {string} firstName - The user's first name.
 * @param {string} lastName - The user's last name.
 * @returns {Promise<{ uid?: string, error?: { code: string; message: string } }>} An object with the new user's UID or an error object.
 */
export async function createUserSelfAction(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ uid?: string; error?: { code: string; message: string } }> {
  try {
    initializeAdminApp();
    const auth = getAuth();
    const firestore = getFirestore();

    // 1. Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${firstName} ${lastName}`,
    });

    // 2. Create user profile in Firestore
    const userPayload: NewUserPayload = {
      firstName,
      lastName,
      email,
      role: 'student', // All new users default to 'student'
      schoolId: 'default-school-id', // Assign to a default school
    };

    await firestore.collection('users').doc(userRecord.uid).set(userPayload);
    
    // Also create the reference in the global students collection for consistency
    await firestore.collection('students').doc(userRecord.uid).set({ id: userRecord.uid });

    return { uid: userRecord.uid };
  } catch (error: any) {
    console.error('Error creating user (Self-Registration Server Action):', error);
    
    return {
      error: {
        code: error.code || 'unknown',
        message:
          error.message || 'An unexpected server error occurred.',
      },
    };
  }
}
