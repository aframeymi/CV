import { Router } from 'express';
import firebaseAuthController from '../controllers/firebase-auth-controller.js';

const router = Router();


router.post('/api/register', firebaseAuthController.registerUser);
router.post('/api/login',  async (req, res) => {
    firebaseAuthController.loginUser
    res.redirect(`/`)
});
router.post('/api/logout', firebaseAuthController.logoutUser);
router.post('/api/reset-password', firebaseAuthController.resetPassword);

export default router;
