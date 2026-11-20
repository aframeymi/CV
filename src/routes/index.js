import { Router } from 'express';
import {
  logIn,
  logOut,
  refuseMoreLogins,
  refuseMorePasswordResets,
  refuseMoreRegistrations,
  register,
  requestPasswordReset,
} from '../controllers/auth-controller.js';
import { limitLoginAttempts, limitPasswordResets, limitRegistrations } from '../middleware/rate-limits.js';

const router = Router();

router.post('/api/register', limitRegistrations(refuseMoreRegistrations), register);
router.post('/api/login', limitLoginAttempts(refuseMoreLogins), logIn);
router.post('/api/logout', logOut);
router.post('/api/reset-password', limitPasswordResets(refuseMorePasswordResets), requestPasswordReset);

export default router;
