import { db } from '../pg.ts';
import { users, products } from '../schema/index.ts';
import { sql } from 'drizzle-orm';

async function testDatabaseConnection() {
  try {
    console.log('🔍 測試數據庫連接...');

    // 測試獲取隨機用戶
    const randomUser = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (randomUser.length === 0) {
      console.log('❌ 沒有找到任何用戶');
      return;
    }

    console.log('✅ 隨機用戶:', randomUser[0]);

    // 測試獲取隨機產品
    const randomProducts = await db
      .select({ id: products.id, name: products.name, stock: products.stock })
      .from(products)
      .where(sql`${products.stock} > 0`)
      .orderBy(sql`RANDOM()`)
      .limit(3);

    if (randomProducts.length === 0) {
      console.log('❌ 沒有找到任何有庫存的產品');
      return;
    }

    console.log('✅ 隨機產品:');
    randomProducts.forEach(product => {
      console.log(`   - ${product.name} (庫存: ${product.stock})`);
    });

    console.log('🎉 數據庫連接測試通過!');

  } catch (error) {
    console.error('❌ 數據庫連接測試失敗:', error);
  }
}

testDatabaseConnection();
