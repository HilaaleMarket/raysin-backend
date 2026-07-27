import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("DHIBAATO: SUPABASE_URL ama SUPABASE_ANON_KEY ma joogaan .env file-ka!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);