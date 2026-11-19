// Firebase client auth functions (from the app's firebase config)
import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from '../config/firebase.js';

// Used to set the user's display name after registration
import { updateProfile } from 'firebase/auth';

// Handles registration and password reset using Firebase Auth
class FirebaseAuthController {

  // create the Firebase account, then pass to the next handler (profile creation)
  registerUser(req, res, next) {
    const { email, password, name, surname } = req.body; 
    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    // Create the account in Firebase
    createUserWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        try {
          const displayName = [name, surname].filter(Boolean).join(' ');
          if (auth.currentUser && displayName) {
            await updateProfile(auth.currentUser, { displayName });
          }
        } catch (e) {
          console.error('Failed to set displayName:', e);
        }

        // Send a verification email (errors are only logged)
        sendEmailVerification(auth.currentUser).catch((e) =>
          console.error('Verification email error:', e)
        );

        // Pass the new user's uid and email to the next handler
        req.firebaseUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
        };

        // Continue to createUserProfile
        return next();
      })
      .catch((error) => {
        console.error(error);

        // Registration failed: return the Firebase error message
        const errorMessage =
          error.message || 'An error occurred while registering user';
        return res.status(500).json({ error: errorMessage });
      });
  }

  // Send a password reset email to the given address
  resetPassword(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({ email: 'Email is required' });
    }

    // Ask Firebase to send the reset email
    sendPasswordResetEmail(auth, email)
      .then(() => {
        res.status(200).json({ message: 'Password reset email sent successfully!' });
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      });
  }
}

export default new FirebaseAuthController();
