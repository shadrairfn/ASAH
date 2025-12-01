// src/db/drizzle-client.ts

import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

export async function createDrizzleClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Connected to Supabase");

  return drizzle(client);
}