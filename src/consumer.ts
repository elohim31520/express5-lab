import { ORDER_TASKS, getOrCreateChannel } from './mq'
import { db } from './pg'
import { users, products, orders, orderItems } from './schema'
import { inArray, sql, eq, and, gte } from 'drizzle-orm'

export const startOrderConsumer = async () => {
	const channel = await getOrCreateChannel('order')

	console.log(`[*] Waiting for messages in ${ORDER_TASKS}`)

	channel.consume(ORDER_TASKS, async (msg) => {
		if (msg === null) return
		const orderData = JSON.parse(msg.content.toString())

		try {
			console.log('-- 訂單處理中 --')
			const { items, ...orderInfo } = orderData

			const productIds = items.map((i: any) => i.productId)
			const dbProducts = await db.select().from(products).where(inArray(products.id, productIds))

			if (dbProducts.length !== items.length) {
				throw new Error('部分商品已失效或不存在')
			}

			let totalAmount = 0
			const itemsWithValidData = items.map((item: any) => {
				const product = dbProducts.find((p) => p.id === item.productId)
				const price = parseFloat(product!.price)
				totalAmount += price * item.quantity

				return {
					productId: item.productId,
					quantity: item.quantity,
					unitPrice: price.toString(), // 使用 DB 的價格
				}
			})

			await db.transaction(async (tx) => {
				for (const item of itemsWithValidData) {
					const result = await tx
						.update(products)
						.set({
							stock: sql`${products.stock} - ${item.quantity}`,
						})
						.where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))

					if (result.count === 0) {
						throw new Error(`商品 ${item.productId} 庫存不足，下單失敗`)
					}
				}

				const [newOrder] = await tx
					.insert(orders)
					.values({ ...orderInfo, totalAmount })
					.returning()
				const finalOrderItems = itemsWithValidData.map((i: any) => ({
					...i,
					orderId: newOrder.id,
				}))
				await tx.insert(orderItems).values(finalOrderItems)
			})

			console.log('✅ 訂單寫入成功！')
			channel.ack(msg) // 確定成功後才簽收
		} catch (error) {
			console.error('❌ 訂單處理失敗:', error)

			// 處理失敗：
			// requeue: false 表示不要塞回原隊列（避免死循環），直接丟掉或進入死信隊列
			channel.nack(msg, false, false)
		}
	})
}
