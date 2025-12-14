'use server';

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, applicationDefault } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin app, ensuring it's only done once.
 * @returns {App} The initialized Firebase Admin App.
 */
function initializeAdminApp(): App {
  if (getApps().length === 0) {
     return initializeApp({
        credential: applicationDefault()
    });
  }
  return getApps()[0];
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

    // Check for the specific authentication error in development
    if (error.code === 'auth/internal-error' && error.message.includes('credential-error')) {
         return {
            error: {
                code: 'credential-error',
                message: "Error de credenciales del servidor. Asegúrate de que tu archivo '.env.local' esté configurado correctamente con la ruta a tu 'serviceAccountKey.json'. Consulta la documentación para más detalles."
            }
        };
    }
    
    return {
      error: {
        code: error.code || 'unknown',
        message:
          error.message || 'An unexpected server error occurred.',
      },
    };
  }
}
