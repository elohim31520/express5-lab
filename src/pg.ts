import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.ts';
import 'dotenv/config';

console.log(process.env.PG_URL);

const connectionString = process.env.PG_URL;

if (!connectionString) {
  throw new Error("PG_URL environment variable is required");
}

const client = postgres(connectionString, { 
  max: 20,
  onnotice: (notice) => console.log(notice), 
});

export const db = drizzle(client, { 
  schema, 
  logger: true
});