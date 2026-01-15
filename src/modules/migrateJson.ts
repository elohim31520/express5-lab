import _ from 'lodash'
const logger = require('../logger')
import { normalizeDate } from './date'
const db = require('../../models')

interface Article {
	title: string
	web_url: string
	release_time: string
	publisher: string
}

interface News extends Article {
	id?: number
	createdAt: Date
	updatedAt: Date
}

export async function migrateTechNews(filePath: string) {
	const fs = require('fs')
	try {
		let rawData: Buffer
		try {
			rawData = fs.readFileSync(filePath)
		} catch (error) {
			throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`)
		}

		let news: News[]
		try {
			news = JSON.parse(rawData.toString())
			if (!_.isArray(news)) {
				throw new Error('JSON data is not an array')
			}
		} catch (error) {
			throw new Error(`Failed to parse JSON: ${(error as Error).message}`)
		}

		const results = await Promise.all(
			news.map(async (vo, index) => {
				try {
					const parsedDate = normalizeDate(vo.release_time)
					if (!parsedDate) {
						throw new Error(`Invalid date format for release_time: ${vo.release_time}`)
					}
					const release_time = parsedDate.toISOString()

					const { id, ...rest } = vo
					await db.tech_investment_news.create({ ...rest, release_time })

					return { status: 'success', data: vo }
				} catch (error) {
					logger.warn(`Error processing item at index ${index}: ${(error as Error).message}`, {
						item: vo,
					})
					return {
						status: 'failed',
						data: vo,
						error: (error as Error).message,
					}
				}
			})
		)

		const successCount = results.filter((r) => r.status === 'success').length
		const failedCount = results.length - successCount

		logger.info(`Migration completed: ${successCount} succeeded, ${failedCount} failed`)

		return { successCount, failedCount, failedItems: results.filter((r) => r.status === 'failed') }
	} catch (error) {
		logger.error(`Migration failed: ${(error as Error).message}`)
		throw error
	}
}
