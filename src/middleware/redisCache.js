const redisClient = require('../modules/redis').default
const responseHelper = require('../modules/responseHelper')
const logger = require('../logger')
const { DEFAULT_CACHE_TIME } = require('../constant/cache')

const redisCache = (expirationTime = DEFAULT_CACHE_TIME) => {
	return async (req, res, next) => {
		if (process.env.DEBUG_MODE) {
			console.log('Debug mode is enabled, skipping cache')
			return next()
		}
		if (!redisClient || !redisClient.isReady) {
			return next()
		}

		const cacheKey = req.originalUrl || req.url
		logger.info(`Get Cache: ${cacheKey}`)

		try {
			const cachedData = await redisClient.get(cacheKey)

			if (cachedData) {
				return res.json(responseHelper.success(JSON.parse(cachedData)))
			}

			logger.info(`Cache miss for ${cacheKey}, will set cache after response`)

			// 修改res.json方法以在發送響應前緩存數據
			const originalJson = res.json
			res.json = function (body) {
				if ([200, 201, 202, 204, 206].includes(+body.code)) {
					logger.info(`Setting cache for ${cacheKey}`, { data: body.data })
					redisClient
						.set(cacheKey, JSON.stringify(body.data), {
							EX: expirationTime,
						})
						.then(() => logger.info(`Successfully set cache for ${cacheKey}`))
						.catch((e) => logger.error(`Redis storage error for ${cacheKey}:`, e))
				}
				return originalJson.call(this, body)
			}

			next()
		} catch (error) {
			logger.error('Redis cache middleware error:', error)
			next()
		}
	}
}

module.exports = redisCache
