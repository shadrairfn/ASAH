import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zpyzyzdevauthtyoxlnu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpweXp5emRldmF1dGh0eW94bG51Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU4OTY2NywiZXhwIjoyMDgwMTY1NjY3fQ.wWzYpPAP51ys3QSuqSDrtChLl5_D69waUfkOMed5Yeo';

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
