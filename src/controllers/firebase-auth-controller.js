import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from '../config/firebase.js';
import { updateProfile } from 'firebase/auth';

class FirebaseAuthController {
  registerUser(req, res, next) {
    const { email, password, name, surname } = req.body; 
    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }

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

        sendEmailVerification(auth.currentUser).catch((e) =>
          console.error('Verification email error:', e)
        );

        req.firebaseUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
        };

        return next();
      })
      .catch((error) => {
        console.error(error);
        const errorMessage =
          error.message || 'An error occurred while registering user';
        return res.status(500).json({ error: errorMessage });
      });
  }

  loginUser(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({
        email: 'Email is required',
        password: 'Password is required',
      });
    }
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const idToken = userCredential._tokenResponse?.idToken;
        if (idToken) {
          res.cookie('access_token', idToken, { httpOnly: true });
          return res.redirect('/');
        } else {
          res.status(500).json({ error: 'Internal Server Error' });
        }
      })
      .catch((error) => {
        console.error(error);
        const errorMessage = error.message || 'An error occurred while logging in';
        res.status(500).json({ error: errorMessage });
      });
  }

  logoutUser(req, res) {
    signOut(auth)
      .then(() => {
        res.clearCookie('access_token');
        return res.redirect('/');
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      });
  }

  resetPassword(req, res) {
    const { email } = req.body;
    if (!email) {
      return res.status(422).json({ email: 'Email is required' });
    }
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
