import { OAuth2Client, TokenPayload } from 'google-auth-library'
import models from '../../models'
import type { DB } from '../types/db'
import { generateToken } from '../modules/crypto'
import { ClientError, ServerError } from '../modules/errors'
const db = models as unknown as DB

const googleOAuth = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

class GoogleAuthService {
	async handleGoogleCredential(credential: string) {
		try {
			// 1. 驗證 ID token
			const ticket = await googleOAuth.verifyIdToken({
				idToken: credential,
				audience: process.env.GOOGLE_CLIENT_ID,
			})

			const payload = ticket.getPayload() as TokenPayload
			if (!payload) throw new ClientError('無效的 token payload')
			if (!payload.sub || !payload.email) throw new ClientError('缺少必要的用戶資訊')

			if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
				throw new ClientError('token audience 不匹配!')
			}
			if (payload.iss !== 'https://accounts.google.com') {
				throw new ClientError('issuer發行商 不匹配!')
			}
			const { sub: googleId, email, name, picture } = payload

			// 處理使用者和外部帳號
			let user
			const thirdpartyAccount = await db.UserThirdpartyAccount.findOne({
				where: { provider: 'google', providerUserId: googleId },
				include: [{ model: db.Users, as: 'user' }],
			})

			if (thirdpartyAccount) {
				// 如果已存在外部帳號，直接取得使用者
				user = thirdpartyAccount.user
				await thirdpartyAccount.update({ picture, name })
			} else {
				// 否則，尋找或創建使用者，然後創建外部帳號
				let localUser = await db.Users.findOne({ where: { email } })

				if (!localUser) {
					// 如果本地使用者不存在，則創建新使用者
					localUser = await db.Users.create({
						name: name || `google_${googleId}`,
						email,
					})
				}

				// 創建新的外部帳號並與使用者關聯
				await db.UserThirdpartyAccount.findOrCreate({
					where: { provider: 'google', providerUserId: googleId },
					defaults: {
						userId: (localUser as any).id,
						provider: 'google',
						providerUserId: googleId,
						picture,
					},
				})
				user = localUser
			}

			if (!user) {
				throw new ServerError('無法創建或找到用戶')
			}

			return {
				token: generateToken({ name: user.name, id: user.id }),
				picture,
				name,
			}
		} catch (error) {
			if (error instanceof ClientError) {
				throw error
			}
			console.error('Google 身份驗證失敗', error)
			throw new ClientError('Google 身份驗證失敗')
		}
	}
}

export default new GoogleAuthService()
