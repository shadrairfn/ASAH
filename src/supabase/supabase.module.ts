import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY // gunakan SERVICE ROLE untuk upload server-side
);

@Module({
  providers: [
    {
      provide: 'SUPABASE',
      useValue: supabase,
    },
  ],
  exports: ['SUPABASE'],
})
export class SupabaseModule {}
