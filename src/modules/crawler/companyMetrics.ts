const cheerio = require('cheerio')
import { isAfter, add } from 'date-fns'
require('dotenv').config()

const { Sp500Fetcher } = require('../financialDataFetcher')

const logger = require('../../logger')
import { getZonedDate } from '../date'

const db = require('../../../models')

interface Statement {
	symbol?: string
	peTrailing?: number
	peForward?: number
	epsTrailing?: number
	price?: number
	epsForward?: number
	volume?: number
	marketCap?: string
	[key: string]: string | number | undefined
}

async function canGetSp500Statements(): Promise<boolean> {
	const lastOne = await db.CompanyStatement.findOne({
		attributes: ['createdAt'],
		order: [['createdAt', 'DESC']],
		limit: 1,
		raw: true,
	})

	if (!lastOne) {
		return true
	}

	return isAfter(getZonedDate(), add(lastOne.createdAt, { hours: 24 }))
}

async function getAllSp500Symbols(): Promise<string[]> {
	const companies = await db.Company.findAll({
		raw: true,
		attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('symbol')), 'symbol']], //去重
	})
	return companies.map((vo: any) => vo.symbol)
}

function extractDataFromHtml(html: string): Statement {
	const $ = cheerio.load(html)

	const targetTable = $('.row .col-lg-7 .table')
	const tdObject: { [key: string]: string } = {}

	targetTable.find('tbody tr').each((index: number, element: cheerio.Element) => {
		const tds = $(element).find('td')

		const key1 = $(tds[0]).text().trim()
		const value1 = $(tds[1]).text().trim()
		const key2 = $(tds[2]).text().trim()
		const value2 = $(tds[3]).text().trim()

		if (key1) tdObject[key1] = value1
		if (key2) tdObject[key2] = value2
	})
	const keymap: { [key: string]: keyof Statement } = {
		'P/E (Trailing)': 'peTrailing',
		'P/E (Forward)': 'peForward',
		'EPS (Trailing)': 'epsTrailing',
		'Prev Close': 'price',
		'EPS (Forward)': 'epsForward',
		'Volume': 'volume',
		'Market Cap': 'marketCap',
	}
	let params: Statement = {}

	for (const key in tdObject) {
		if (keymap.hasOwnProperty(key)) {
			const newkey = keymap[key]
			const value = tdObject[key]
			// 检查 value 是否存在
			if (value !== undefined && value !== '') {
				// 根据 newkey 类型进行转换
				if (newkey === 'marketCap') {
					params[newkey] = value // marketCap 是字符串
				} else {
					// 将值转换为数字并检查是否有效
					const numericValue = parseFloat(value.replace(/,/g, ''))
					if (!isNaN(numericValue)) {
						params[newkey as string] = numericValue
					}
				}
			}
		}
	}
	return params as Statement
}

export async function crawlCompanyMetrics(): Promise<void> {
	try {
		const sleepTime = 6 * 1000

		const symbols = await getAllSp500Symbols()
		
		if (!symbols || symbols.length === 0) {
			logger.warn('Skipping fetch Sp500 Statements: No symbols found in the database.')
			return
		}

		if (!process.env.SP500_URL) {
			logger.error('SP500_URL is not defined in environment variables.')
			return
		}
		const myFetch = new Sp500Fetcher({
			requestUrl: process.env.SP500_URL,
			stockSymbols: symbols,
		})

		while (true) {
			const symbol = myFetch.getCurrentSymbol()
			if (!symbol) {
				const errorSymbols = myFetch.getAllErrorSymbols()
				if (errorSymbols && errorSymbols.length > 0) {
					logger.warn(`Finished crawling with failed symbols: ${errorSymbols.join(', ')}`)
				} else {
					logger.info('All symbols processed successfully.')
				}
				break
			}

			try {
				const htmlContent = await myFetch.fetchHtml()
				const data = extractDataFromHtml(htmlContent)
				await db.CompanyStatement.create({ ...data, symbol: symbol })
				logger.info(`Successfully processed symbol: ${symbol}`)
				myFetch.currentIndex++
				await new Promise((resolve) => setTimeout(resolve, sleepTime))
			} catch (e: any) {
				logger.error(`Failed to process symbol ${symbol}: ${(e as Error).message}`)
				myFetch.addErrorSymbol()
				myFetch.currentIndex++
			}
		}
	} catch (e: any) {
		logger.error((e as Error).message)
	}
}
