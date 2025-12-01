import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  dialect: "postgresql",      // <── WAJIB untuk pg driver baru
  out: "./src/db/migrations",
  schema: "./src/db/schema",
  dbCredentials: {
    url: process.env.DATABASE_URL!,   // <── gunakan "url", bukan "connectionString"
  },
});
