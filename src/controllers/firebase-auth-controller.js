// Firebase client auth functions (from the app's firebase config)
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from '../config/firebase.js';

// Used to set the user's display name after registration
import { updateProfile } from 'firebase/auth';

// Handles register, login, logout and password reset using Firebase Auth
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

  // Log in with email and password, then store the token in a cookie
  loginUser(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }

    // Sign in with Firebase
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {

        // Get the ID token that the middleware later verifies
        const idToken = userCredential._tokenResponse?.idToken;
        if (idToken) {

          // Save the token in an httpOnly cookie (not readable by browser scripts)
          res.cookie('access_token', idToken, { httpOnly: true });
          return res.redirect('/');
        } else {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      })
      .catch((error) => {
        console.error(error);

        // Login failed: return the Firebase error message
        const errorMessage = error.message || 'An error occurred while logging in';
        res.status(500).json({ error: errorMessage });
      });
  }

  // Log out: sign out of Firebase and delete the token cookie
  logoutUser(req, res) {
    signOut(auth)
      .then(() => {

        // Remove the login cookie and return to the home page
        res.clearCookie('access_token');
        return res.redirect('/');
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
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
