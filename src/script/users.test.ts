import request from 'supertest'
import express from 'express'
import { db } from '../pg'
import { users } from '../schema'
import userRoutes from '../routes/users'

describe('Users API', () => {
	let app: express.Application

	beforeAll(async () => {
		// 確保資料庫連線正常
		try {
			await db.execute('SELECT 1')
		} catch (error) {
			console.error('Database connection failed:', error)
			throw error
		}

		// 為測試創建獨立的 app 實例
		app = express()
		app.use(express.json())
		app.use('/users', userRoutes)

		// 添加測試用的路由
		app.get('/user/:id', (req, res) => {
			res.send(`User ID: ${req.params.id}`)
		})
	})

	describe('GET /users/all', () => {
		it('應該成功獲取所有用戶', async () => {
			const response = await request(app).get('/users/all').expect(200)

			expect(response.body).toHaveProperty('success', true)
			expect(response.body).toHaveProperty('data')
			expect(Array.isArray(response.body.data)).toBe(true)

			// 如果有資料，檢查資料結構
			if (response.body.data.length > 0) {
				const user = response.body.data[0]
				expect(user).toHaveProperty('id')
				expect(user).toHaveProperty('name')
				expect(user).toHaveProperty('email')
				expect(typeof user.id).toBe('string')
				expect(typeof user.name).toBe('string')
				expect(typeof user.email).toBe('string')
			}
		})

		it('應該返回正確的響應格式', async () => {
			const response = await request(app).get('/users/all').expect('Content-Type', /json/)

			expect(response.body).toMatchObject({
				success: expect.any(Boolean),
				data: expect.any(Array),
			})
		})
	})

	describe('GET /user/:id', () => {
		it('應該返回用戶ID', async () => {
			const testId = '123'
			const response = await request(app).get(`/user/${testId}`).expect(200)

			expect(response.text).toBe(`User ID: ${testId}`)
		})

		it('應該處理不同的用戶ID', async () => {
			const testIds = ['abc', '456', 'user-789']

			for (const id of testIds) {
				const response = await request(app).get(`/user/${id}`).expect(200)

				expect(response.text).toBe(`User ID: ${id}`)
			}
		})
	})
})
