import { Router } from 'express';
import { PERMISSIONS } from '@carebridge/shared';
import { authenticate, getAuth, requirePermission } from '../../middleware/auth';
import { ok, parse, uuidParam } from '../../utils/http';
import { addCartItemSchema, cartFromPrescriptionSchema, updateCartItemSchema } from './cart.schemas';
import * as cartService from './cart.service';

export const cartRouter = Router();
cartRouter.use(authenticate, requirePermission(PERMISSIONS.CART_MANAGE));

cartRouter.get('/', async (req, res) => {
  ok(res, await cartService.getCart(getAuth(req)));
});

cartRouter.post('/items', async (req, res) => {
  const input = parse(addCartItemSchema, req.body);
  ok(res, await cartService.addCartItem(getAuth(req), input));
});

cartRouter.patch('/items/:medicineId', async (req, res) => {
  const { id: medicineId } = parse(uuidParam, { id: req.params.medicineId });
  const input = parse(updateCartItemSchema, req.body);
  ok(res, await cartService.updateCartItem(getAuth(req), medicineId, input));
});

cartRouter.delete('/items/:medicineId', async (req, res) => {
  const { id: medicineId } = parse(uuidParam, { id: req.params.medicineId });
  ok(res, await cartService.removeCartItem(getAuth(req), medicineId));
});

cartRouter.delete('/', async (req, res) => {
  ok(res, await cartService.clearCart(getAuth(req)));
});

cartRouter.post('/from-prescription', async (req, res) => {
  const input = parse(cartFromPrescriptionSchema, req.body);
  ok(res, await cartService.buildCartFromPrescription(getAuth(req), input));
});
