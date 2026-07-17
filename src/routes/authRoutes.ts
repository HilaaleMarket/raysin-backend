import { Router } from 'express';
import { 
  registerUser, 
  loginUser, 
  registerVendor, 
  loginVendor 
} from '../controllers/authController.js';

const router = Router();

// Waddooyinka Macmiilka iyo Admin-ka (User Routes)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Waddooyinka Iibiyaha (Vendor Routes)
router.post('/vendor/register', registerVendor);
router.post('/vendor/login', loginVendor);

export default router;