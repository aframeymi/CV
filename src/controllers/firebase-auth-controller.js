// Firebase client auth functions (from the app's firebase config)
import { auth } from '../config/firebase.js';

// Handles password reset using Firebase Auth
class FirebaseAuthController {

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
