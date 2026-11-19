import { Router } from 'express';
import { logIn, logOut, register, requestPasswordReset } from '../controllers/auth-controller.js';

const router = Router();

router.post('/api/register', register);
router.post('/api/login', logIn);
router.post('/api/logout', logOut);
router.post('/api/reset-password', requestPasswordReset);

export default router;