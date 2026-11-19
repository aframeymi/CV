import { Router } from 'express';
import firebaseAuthController from '../controllers/firebase-auth-controller.js';
import { logIn, logOut, register } from '../controllers/auth-controller.js';

const router = Router();

router.post('/api/register', register);
router.post('/api/login', logIn);
router.post('/api/logout', logOut);
router.post('/api/reset-password', firebaseAuthController.resetPassword);

export default router;