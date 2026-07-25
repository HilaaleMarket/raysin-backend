import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from '@prisma/config';

// Waxay si sax ah u load-garaynaysaa .env xataa haddii CLI-gu uu ka ordayo meel kale
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || process.env.DIRECT_URL || '',
  },
});