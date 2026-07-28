import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Raro .env faylka ka hor inta aan xogta la akhrin
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ DHIBAATO: SUPABASE_URL ama SUPABASE_ANON_KEY ma joogaan .env file-ka!");
} else {
  console.log("✅ Supabase Client si sax ah ayaa loo xidhiidhiyay.");
}


export const supabase = createClient(
  supabaseUrl || 'https://anaxksomjoxmfxmmqcat.supabase.co/rest/v1/',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuYXhrc29tam94bWZ4bW1xY2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxODczNzUsImV4cCI6MjA5OTc2MzM3NX0.98iuPquxI3eiUkb2cdPl3d58i8F8KUMPXaRzmyHxAV8'
);