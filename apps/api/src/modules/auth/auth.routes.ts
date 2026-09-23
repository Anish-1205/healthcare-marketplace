import { Router } from 'express';
import { authenticate, getAuth } from '../../middleware/auth';
import { created, ok, parse } from '../../utils/http';
import {
  forgotPasswordSchema,
  loginSchema,
  registerPatientSchema,
  resetPasswordSchema,
} from './auth.schemas';
import * as authService from './auth.service';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const input = parse(registerPatientSchema, req.body);
  created(res, await authService.registerPatient(input, req.ip));
});

authRouter.post('/login', async (req, res) => {
  const input = parse(loginSchema, req.body);
  ok(res, await authService.login(input, req.ip));
});

authRouter.post('/logout', authenticate, async (req, res) => {
  await authService.logout(getAuth(req).userId, req.ip);
  ok(res, { loggedOut: true });
});

authRouter.get('/me', authenticate, async (req, res) => {
  ok(res, await authService.getCurrentUser(getAuth(req).userId));
});

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = parse(forgotPasswordSchema, req.body);
  ok(res, await authService.requestPasswordReset(email));
});

authRouter.post('/reset-password', async (req, res) => {
  const input = parse(resetPasswordSchema, req.body);
  await authService.resetPassword(input);
  ok(res, { reset: true });
});
