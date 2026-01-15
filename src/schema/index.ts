import { pgTable, text, varchar, integer, numeric, timestamp, pgEnum, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'shipped', 'completed', 'cancelled']);

// 1. 使用者表
export const users = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
});

// 2. 商品表
export const products = pgTable('products', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
});

// 3. 訂單主表
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid('user_id').references(() => users.id).notNull(), 
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. 訂單詳情表
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
});