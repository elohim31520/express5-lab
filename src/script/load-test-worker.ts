import { parentPort, workerData } from 'worker_threads';
import { placeOrder } from './order.ts';

interface WorkerData {
  workerId: number;
  ordersPerWorker: number;
  delayBetweenOrders: number;
}

async function runWorker() {
  const { workerId, ordersPerWorker, delayBetweenOrders } = workerData as WorkerData;

//   console.log(`🤖 Worker ${workerId} 開始運行，計劃處理 ${ordersPerWorker} 個訂單`);

  for (let i = 0; i < ordersPerWorker; i++) {
    try {
      // 嘗試下單
      await placeOrder();

      // 發送成功消息給主線程
      parentPort?.postMessage({
        type: 'order_completed',
        workerId,
        orderNumber: i + 1,
      });

    } catch (error) {
      // 發送失敗消息給主線程
      parentPort?.postMessage({
        type: 'order_failed',
        workerId,
        orderNumber: i + 1,
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }

    // 等待指定的延遲時間
    if (i < ordersPerWorker - 1) { // 最後一個訂單不需要等待
      await new Promise(resolve => setTimeout(resolve, delayBetweenOrders));
    }
  }

  console.log(`✅ Worker ${workerId} 完成所有訂單處理`);
}

runWorker().catch(error => {
  console.error(`❌ Worker ${workerData.workerId} 發生未預期的錯誤:`, error);
  parentPort?.postMessage({
    type: 'worker_error',
    workerId: workerData.workerId,
    error: error instanceof Error ? error.message : '未知錯誤',
  });
});
