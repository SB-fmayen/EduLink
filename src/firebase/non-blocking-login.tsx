'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
  FirebaseError,
  // Assume getAuth and app are initialized elsewhere
} from 'firebase/auth';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  // CRITICAL: Call signInAnonymously directly. Do NOT use 'await signInAnonymously(...)'.
  signInAnonymously(authInstance);
  // Code continues immediately. Auth state change is handled by onAuthStateChanged listener.
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(
  authInstance: Auth, 
  email: string, 
  password: string, 
  onSuccess?: (user: User) => void,
  onError?: (error: FirebaseError) => void
): void {
  createUserWithEmailAndPassword(authInstance, email, password)
    .then(userCredential => {
      if(onSuccess) {
        onSuccess(userCredential.user);
      }
    })
    .catch((error: FirebaseError) => {
      if (onError) {
        onError(error);
      }
    });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(
  authInstance: Auth, 
  email: string, 
  password: string,
  callback?: (error: FirebaseError | null) => void
): void {
  signInWithEmailAndPassword(authInstance, email, password)
    .then(() => {
      if (callback) {
        callback(null); // Success
      }
    })
    .catch((error: FirebaseError) => {
      if (callback) {
        callback(error); // Failure
      }
    });
}
