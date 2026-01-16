import 'reflect-metadata'
import express, { Request, Response } from 'express'
import { initMQ, sendOrder } from './mq'
import { db } from './pg'
import userRoutes from './routes/users'
import errorHandler from './middleware/errorHandler'
import { startOrderConsumer } from './consumer'

const app = express()
const port = 3001
app.use(express.json({ type: ['application/json', 'application/json; charset=UTF-8'] }))

function setupRoutes() {
	app.use('/users', userRoutes)

	app.get('/user/:id', (req: Request, res: Response) => {
		res.send(`User ID: ${req.params.id}`)
	})

	app.post('/order', (req: Request, res: Response) => {
		const order = req.body

		res.status(202).json({ message: '訂單處理中...' })

		console.log('將任務丟入隊列:', order)
		sendOrder(order)
	})
}

async function bootstrap() {
	try {
		await db.execute('SELECT 1')
		console.log('📊 資料庫連線成功')

		await initMQ()
		console.log('🐇 RabbitMQ 連線成功')

		// 啟動訂單消費者來監聽訊息
		startOrderConsumer().catch((error) => {
			console.error('❌ 訂單消費者啟動失敗:', error)
		})

		setupRoutes()

		app.use(errorHandler)

		console.log('🔧 正在啟動 HTTP 伺服器...')
		const server = app.listen(port, 'localhost', () => {
			console.log(`🚀 Server is running at http://localhost:${port}`)
		})

		server.on('error', (error) => {
			console.error('❌ 伺服器啟動錯誤:', error)
		})

		server.on('listening', () => {
			console.log('✅ 伺服器成功監聽端口', port)
		})
	} catch (error) {
		console.error('❌ 伺服器啟動失敗:', error)
		process.exit(1)
	}
}

// Export app for testing
export { app, setupRoutes }

bootstrap()
