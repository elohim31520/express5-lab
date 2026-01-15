const redisClient = require('../modules/redis').default
const responseHelper = require('../modules/responseHelper')
const logger = require('../logger')

const conditionalCache = (duration, condition) => async (req, res, next) => {
	if (process.env.DEBUG_MODE || !condition(req)) {
		return next()
	}

	const key = `__express__${req.originalUrl || req.url}`
	try {
		const cachedBody = await redisClient.get(key)
		if (cachedBody) {
			res.setHeader('Content-Type', 'application/json')
			res.send(cachedBody)
			return
		}

		const originalSend = res.send
		res.send = async (body) => {
			try {
				await redisClient.set(key, body, 'EX', duration)
			} catch (error) {
				console.error('Redis set error:', error)
			}
			originalSend.call(res, body)
		}
		next()
	} catch (error) {
		console.error('Redis get error:', error)
		next()
	}
}

module.exports = conditionalCache
