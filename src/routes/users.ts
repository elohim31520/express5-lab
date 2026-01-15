import express, { Router } from 'express'
import userController from '../controller/userController'

const router: Router = express.Router()

router.get('/all', userController.getAll)

export default router