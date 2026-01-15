const { AuthError } = require('../modules/errors')

/**
 * 用戶上下文中間件
 * 此中間件會在 verifyToken 之後執行
 * 會將用戶資訊添加到 req.user 中
 */
async function userContext(req, res, next) {
	try {
		const { name, id } = req.decoded
		if (!id) {
			throw new AuthError('找不到用戶資訊')
		}

		req.user = { name, id }

		next()
	} catch (error) {
		next(error)
	}
}

module.exports = {
	userContext,
}
