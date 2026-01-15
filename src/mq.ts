import { Connection, Channel, connect } from 'amqplib'
import * as amqp from 'amqplib'
type BusinessModule = 'order' | 'payment' | 'inventory' | 'notification'

let connection: amqp.Connection;
const channels: Map<string, Channel> = new Map()

export const initMQ = async () => {
	connection = (await connect('amqp://localhost')) as unknown as Connection;
	console.log('✅ RabbitMQ Connection Established')
}

export const ORDER_TASKS: string = 'order_tasks'

export const getOrCreateChannel = async (name: string): Promise<amqp.Channel> => {
	if (!connection) {
        throw new Error('MQ connection not initialized. Call initMQ first.')
    }

	if (channels.has(name)) {
		return channels.get(name)!
	}

	const channel = await (connection as any).createChannel();

	if (name === 'order') {
		await channel.assertQueue(ORDER_TASKS, {
			arguments: { 'x-dead-letter-exchange': 'order_dlx' },
			durable: true,
		})
	}

	channels.set(name, channel)
	return channel
}

interface OrderPayload {
	orderId: string
	userId: string
	items: { productId: string; quantity: number }[]
}

export const sendOrder = async (data: OrderPayload) => {
	const channel = await getOrCreateChannel('order')
	channel.sendToQueue(ORDER_TASKS, Buffer.from(JSON.stringify(data)))
}
