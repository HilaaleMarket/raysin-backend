import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Relative imports leh .js extensions (NodeNext ESM requirements)
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/apiRoutes.js';
import orderRoutes from './routes/order.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Prisma Client & PostgreSQL Adapter Setup
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

// Array-ga origins-ka idanka leh
const allowedOrigins = [
  'https://hilaale.com',
  'https://www.hilaale.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

// CORS Options oo leh TypeScript Types si uu Render/tsc uga baxo implicit 'any' error
const corsOptions: CorsOptions = {
  origin: (
    origin: string | undefined, 
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback for testing/mobile
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Middleware Setup
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('Raysin / Hilaale API Server is LIVE 🚀');
});

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Hilaale Backend is running smoothly 🚀' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/orders', orderRoutes);

// Server Listening
app.listen(PORT, () => {
  console.log(`⚡️ [server]: Hilaale API Server wuxuu ka kiciyay http://localhost:${PORT}`);
});