import { Router } from 'express';
import firebaseAuthController from '../controllers/firebase-auth-controller.js';
import { createUserProfile } from '../controllers/user-controller.js';

const router = Router();


router.post(
  '/api/register',
  firebaseAuthController.registerUser, 
  createUserProfile  
);

router.post('/api/login', firebaseAuthController.loginUser);
router.post('/api/logout', firebaseAuthController.logoutUser);
router.post('/api/reset-password', firebaseAuthController.resetPassword);

export default router;