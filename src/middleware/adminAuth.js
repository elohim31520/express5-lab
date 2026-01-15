const { AuthError } = require('../modules/errors')
const db = require('../../models')

async function verifyAdmin(req, res, next) {
	try {
		const user = await db.Users.findOne({
			where: { name: req.decoded?.name },
			include: [
				{
					model: db.Admin,
					as: 'admin',
				},
			],
		})

		if (!user || !user.admin) {
			throw new AuthError('需要管理員權限')
		}

		next()
	} catch (error) {
		next(error)
	}
}

module.exports = {
	verifyAdmin,
}
