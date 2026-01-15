const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const publicKey = fs.readFileSync(path.join(process.cwd(), 'secrets', 'public.key'), 'utf8')
const { AuthError } = require('../modules/errors')
const _ = require('lodash')

function verifyToken(req, res, next) {
	try {
		const auth = _.get(req, 'headers.authorization', '')
		if (!auth) throw new AuthError('未提供授權標頭')

		const parts = auth.split(' ')
		if (parts.length !== 2 || parts[0] !== 'Bearer') {
			throw new AuthError('授權格式無效')
		}

		const token = parts[1]
		if (!token || _.isUndefined(token)) {
			throw new AuthError('Token無效')
		}
		jwt.verify(token, publicKey, (err, decoded) => {
			if (err) {
				throw new AuthError('Token驗證失敗: ' + err.message)
			}
			req.decoded = decoded
			next()
		})
	} catch (error) {
		next(error)
	}
}

module.exports = {
	verifyToken,
}
