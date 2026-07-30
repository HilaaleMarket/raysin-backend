import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js'; // 👈 KU DAR KAN
// ✅ Ku beddel kan (Sida uu faylkaagu yahay 📁 src/routes/):
import vendorRoutes from './routes/vendorRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Prisma Setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// Allowed Domains
const allowedOrigins = [
  'https://hilaale.com',
  'https://www.hilaale.com',
  'https://api.hilaale.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8443'
];

const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

// 🟢 1. Dynamic CORS Middleware
app.use(cors(corsOptions));

// 🟢 2. Body Parser
app.use(express.json());

// Endpoints Test
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Hilaale API Server is LIVE 🚀');
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Hilaale Backend is running smoothly 🚀' });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes); // 👈 Sidaan inay ahaato waa sax
app.use('/api/vendors', vendorRoutes);   // 👈 KU DAR KAN

app.listen(PORT, () => {
  console.log(`⚡️ [server]: Hilaale API Server wuxuu ka kiciyay http://localhost:${PORT}`);
});