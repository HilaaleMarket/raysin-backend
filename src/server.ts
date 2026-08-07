import express, { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import orderRoutes from './routes/order.routes.js';
import productRoutes from './routes/product.routes.js'; 
import vendorRoutes from './routes/vendorRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Prisma Setup
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// Dynamic Allowed Origins
const allowedOrigins = [
  'https://hilaale.com',
  'https://www.hilaale.com',
  'https://api.hilaale.com',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

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

// CORS Middleware
app.use(cors(corsOptions));

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Endpoints Test (Root Response)
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send(`
    <html>
      <head><title>Hilaale API</title></head>
      <body style="background:#080810;color:#00ffcc;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h1>🚀 Hilaale API Server is LIVE</h1>
          <p style="color:#aaa;">System initialized successfully on Render.</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Hilaale Backend is running smoothly 🚀' });
});

// API Endpoints
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api', apiRoutes);

// Global Express Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Internal Server Error:', err.stack);

  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
    error: err.message || 'Unknown error occurred'
  });
});

// Start Server on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`⚡️ [server]: Hilaale API Server is running on http://0.0.0.0:${PORT} [${env.toUpperCase()}]`);
});