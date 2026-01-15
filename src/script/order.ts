import axios from 'axios';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface OrderRequest {
  userId: string;
  items: OrderItem[];
}

async function testOrderAPI() {
  const baseURL = 'http://localhost:3001';

  // 建立測試訂單資料
  const orderData: OrderRequest = {
    userId: '019bb020-9c1e-7a5a-86db-1478f9ff3fba',
    items: [
      {
        productId: '019bb020-9c40-787f-b3a6-88cd5e79339a',
        quantity: 2,
      },
      {
        productId: '019bba84-3e16-79b5-b167-6cd3f2122fd0',
        quantity: 1,
      }
    ]
  };

  try {
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

// 執行測試
testOrderAPI();
