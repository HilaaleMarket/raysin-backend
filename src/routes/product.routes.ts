import { Router } from 'express';
import multer from 'multer';
import { 
  createProduct, 
  getProducts, 
  getMyProducts, 
  getProductById, 
  updateProduct, 
  deleteProduct 
} from '../controllers/productController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

router.get('/products', getProducts);
router.get('/products/my-products', authenticateToken, getMyProducts);
router.get('/products/:id', getProductById);

router.post('/products', authenticateToken, upload.single('image'), createProduct);
router.put('/products/:id', authenticateToken, upload.single('image'), updateProduct);
router.delete('/products/:id', authenticateToken, deleteProduct);

export default router;