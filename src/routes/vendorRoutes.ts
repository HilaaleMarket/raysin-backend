import { Router } from 'express';
import {
  getVendors,
  getVendorById,
  createVendor,
  updateVendor,
  updateVendorStatus
} from '../controllers/vendorController.js';

const router = Router();

// Standard CRUD Routes
router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.put('/:id', updateVendor);

// Approve / Block Routes (Ka kooban labada hab ee Frontend-ku u soo diri karo)
router.patch('/:id/status', updateVendorStatus);
router.put('/status', updateVendorStatus);

export default router;