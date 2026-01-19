import { pgTable, serial, text, varchar, integer, numeric, timestamp, pgEnum, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { relations } from 'drizzle-orm';
export const orderStatusEnum = pgEnum('order_status', ['pending', 'paid', 'shipped', 'completed', 'cancelled']);

// 1. 使用者表
export const users = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  name: text('name').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }) //不設定notNull 因為會有第三方登入
});

export const userThirdpartyAccounts = pgTable('user_thirdparty_accounts', {
  id: uuid('id').primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerUserId: text('provider_user_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  picture: text('picture'),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userThirdpartyAccountsRelations = relations(userThirdpartyAccounts, ({ one }) => ({
  user: one(users, {
    fields: [userThirdpartyAccounts.userId],
    references: [users.id],
  }),
}));

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

export const stockTradeTypeEnum = pgEnum('stock_trade_type', ['buy', 'sell']);

export const stockTrades = pgTable('stock_trades', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  companyId: integer('company_id').notNull(),
  tradeType: stockTradeTypeEnum('trade_type').notNull(),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  tradeDate: timestamp('trade_date', { withTimezone: true }).defaultNow().notNull(),
});