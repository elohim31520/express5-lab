import { parentPort, workerData } from 'worker_threads'
import { placeOrder } from './order.ts'
import { db } from '../pg.ts'
import { users, products } from '../schema/index.ts'

interface WorkerData {
	workerId: number
	ordersPerWorker: number
	delayBetweenOrders: number
}

interface OrderItem {
	productId: string
	quantity: number
}

// --- 主要邏輯 ---
async function runWorker() {
	const { workerId, ordersPerWorker, delayBetweenOrders } = workerData as WorkerData

	console.log(`🤖 Worker ${workerId} 正在從資料庫預載基礎資料...`)

	try {
		const [userData, productData] = await Promise.all([
			db.select({ id: users.id }).from(users),
			db.select({ id: products.id }).from(products),
		])

		const allUserIds = userData.map((u) => u.id)
		const allProductIds = productData.map((p) => p.id)

		if (allUserIds.length === 0 || allProductIds.length === 0) {
			throw new Error('資料庫中沒有使用者或產品，無法進行測試')
		}

		console.log(`🚀 Worker ${workerId} 資料準備就緒，開始執行 ${ordersPerWorker} 個訂單`)

		// 2. 進入下單迴圈
		for (let i = 0; i < ordersPerWorker; i++) {
			try {
				// --- 隨機產生符合 OrderData 結構的資料 ---

				// 隨機選一個 userId
				const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)]

				// 隨機選 1~5 個產品組成 items 陣列
				const itemCount = Math.floor(Math.random() * 5) + 1
				const items: OrderItem[] = []

				for (let j = 0; j < itemCount; j++) {
					const randomProductId = allProductIds[Math.floor(Math.random() * allProductIds.length)]
					items.push({
						productId: randomProductId,
						quantity: Math.floor(Math.random() * 5) + 1, // 隨機數量 1~5
					})
				}

				// --- 呼叫你的 placeOrder 函式 ---
				await placeOrder({
					userId,
					items,
				})

				// 成功通知
				parentPort?.postMessage({
					type: 'order_completed',
					workerId,
					orderNumber: i + 1,
				})
			} catch (error) {
				// 失敗通知 (例如 API 回傳 400 庫存不足)
				parentPort?.postMessage({
					type: 'order_failed',
					workerId,
					orderNumber: i + 1,
					error: error instanceof Error ? error.message : '訂單執行失敗',
				})
			}

			// 3. 控制壓力節奏 (Delay)
			if (i < ordersPerWorker - 1 && delayBetweenOrders > 0) {
				await new Promise((res) => setTimeout(res, delayBetweenOrders))
			}
		}

		console.log(`✅ Worker ${workerId} 任務圓滿完成`)
	} catch (initError) {
		console.error(`❌ Worker ${workerId} 初始化失敗:`, initError)
		parentPort?.postMessage({
			type: 'worker_error',
			workerId,
			error: initError instanceof Error ? initError.message : '初始化錯誤',
		})
	}
}

// 執行
runWorker()
