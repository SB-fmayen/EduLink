'use server';

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin app, ensuring it's only done once.
 * It relies on Google Application Default Credentials for authentication.
 * @returns {App} The initialized Firebase Admin App.
 */
function initializeAdminApp(): App {
  // If no apps are initialized, initialize a new one.
  // initializeApp() will automatically use the GOOGLE_APPLICATION_CREDENTIALS
  // environment variable for authentication.
  if (getApps().length === 0) {
    return initializeApp();
  }
  // Otherwise, return the already initialized app.
  return getApps()[0];
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
    return { error: { code: error.code || 'unknown', message: error.message || 'An unexpected server error occurred.' } };
  }
}
