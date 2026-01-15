import axios from 'axios';
import { db } from '../pg.ts';
import { users, products } from '../schema/index.ts';
import { eq, sql } from 'drizzle-orm';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface OrderRequest {
  userId: string;
  items: OrderItem[];
}

// 隨機獲取一個用戶 ID
async function getRandomUserId(): Promise<string> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .orderBy(sql`RANDOM()`)
    .limit(1);

  if (result.length === 0) {
    throw new Error('沒有找到任何用戶');
  }

  return result[0].id;
}

// 隨機獲取多個產品（1-5個）
async function getRandomProducts(count: number = Math.floor(Math.random() * 5) + 1): Promise<Array<{id: string, stock: number}>> {
  const result = await db
    .select({ id: products.id, stock: products.stock })
    .from(products)
    .where(sql`${products.stock} > 0`)
    .orderBy(sql`RANDOM()`)
    .limit(count);

  if (result.length === 0) {
    throw new Error('沒有找到任何有庫存的產品');
  }

  return result;
}

async function createRandomOrder(): Promise<OrderRequest> {
  const userId = await getRandomUserId();
  const products = await getRandomProducts();

  const items: OrderItem[] = products.map(product => ({
    productId: product.id,
    quantity: Math.floor(Math.random() * Math.min(product.stock, 5)) + 1, // 隨機數量 1-5，但不超過庫存
  }));

  return {
    userId,
    items,
  };
}

async function testOrderAPI() {
  const baseURL = 'http://localhost:3001';

  try {
    // 隨機生成訂單資料
    const orderData = await createRandomOrder();
    console.log('🎯 生成的訂單資料:', {
      userId: orderData.userId,
      itemsCount: orderData.items.length,
      items: orderData.items
    });

    console.log('🚀 開始測試訂單 API...');

    const response = await axios.post(`${baseURL}/order`, orderData);

    console.log('✅ 訂單請求成功!');
    console.log('📊 回應狀態:', response.status);
    console.log('📝 回應資料:', response.data);

  } catch (error: any) {
    console.error('❌ 訂單請求失敗:');

    if (error.response) {
      // 伺服器回應錯誤
      console.error('狀態碼:', error.response.status);
      console.error('錯誤訊息:', error.response.data);
    } else if (error.request) {
      // 網路錯誤
      console.error('網路錯誤:', error.message);
    } else {
      // 其他錯誤
      console.error('錯誤:', error.message);
    }
  }
}

// 用於 worker 的下單函數
export async function placeOrder(baseURL: string = 'http://localhost:3001') {
  try {
    const orderData = await createRandomOrder();
    const response = await axios.post(`${baseURL}/order`, orderData);

    console.log(`✅ Worker ${process.pid} 訂單成功: ${response.data.id || 'unknown'}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Worker ${process.pid} 訂單失敗:`, error.response?.data || error.message);
    throw error;
  }
}

// 執行測試
testOrderAPI();
