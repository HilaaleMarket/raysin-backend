import { Router } from 'express';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor
} from '../controllers/vendorController.js';

const router = Router();

router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.put('/:id', updateVendor);

export default router;