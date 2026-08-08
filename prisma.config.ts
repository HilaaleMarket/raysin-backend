import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from '@prisma/config';

// Waxay si sax ah u load-garaynaysaa .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // DB Push & Migrations waxay si toos ah u adeegsanayaan DIRECT_URL (Port 5432)
    // Haddii DIRECT_URL la waayo kaliya wuxuu u gudbi doonaa DATABASE_URL
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});