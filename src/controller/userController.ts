import { Request, Response, NextFunction } from 'express'
import { db } from '../pg'
import { users } from '../schema'

class UserController {
	async getAll(req: Request, res: Response) {
		const allUsers = await db.select().from(users)
		res.status(200).json({
			success: true,
			data: allUsers,
		})
	}
}

export default new UserController()
