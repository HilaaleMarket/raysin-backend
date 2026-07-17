import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Waxaan u baahanahay inaan halkan ku kicinno dotenv si uu process.env u shaqeeyo
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});