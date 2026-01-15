import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

console.log(process.env.PG_URL);

const connectionString = process.env.PG_URL;

if (!connectionString) {
  throw new Error("PG_URL environment variable is required");
}

// 1. 建立底層驅動連線
const client = postgres(connectionString, { 
  max: 1, // 開發環境通常 1 個連線即可
  // 如果需要類似 logging: true 的效果，可以在這裡加
  onnotice: (notice) => console.log(notice), 
});

// 2. 初始化 Drizzle
export const db = drizzle(client, { 
  schema, 
  logger: true // 這對應到 TypeORM 的 logging: true
});