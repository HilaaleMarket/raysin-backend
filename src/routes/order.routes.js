import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getVendorOrders,
  approveDirectVendorPayment
} from '../controllers/orderController.js';

const router = Router();

router.post('/', createOrder);
router.get('/user', getUserOrders);
router.get('/vendor', getVendorOrders);
router.patch('/:orderId/approve', approveDirectVendorPayment);

export default router;