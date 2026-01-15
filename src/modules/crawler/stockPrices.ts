import axios from 'axios'
const cheerio = require('cheerio')
import _ from 'lodash'
require('dotenv').config()
import { MARKET_INDEX_HEADERS } from '../../constant/config'
import { decodeBuffer } from '../util'
const logger = require('../../logger')
import { convertToEST } from '../date'
const db = require('../../../models')

interface StockPrice {
	companyName?: string
	MCap?: string
	date?: string
	symbol?: string
	timestamp?: string
	price: number
	dayChg: number
	yearChg?: number
	weight: number
	company_id?: number
}

function getSymbol(companyName: string, symbols: any[]): string {
	const segmentName = companyName.split(' ')[0]
	const regex = new RegExp(segmentName, 'i')
	const symbol = symbols.find((vo: any) => regex.test(vo.name))?.symbol
	return symbol
}

async function extractDataFromHtml(htmlContent: string): Promise<StockPrice[]> {
	const $ = cheerio.load(htmlContent)
	const componentsTable = $('.table-responsive').first().find('table');
	const rows = componentsTable.find('tbody tr').toArray()
	if (rows.length === 0) {
        console.warn("警告：找不到任何數據列，請檢查選擇器或 HTML 內容");
        return [];
    }

	const stockPrices: StockPrice[] = []

	let pageDate = new Date().toISOString().split('T')[0]
	const timestamp = String(Date.now())

	const companies = await db.Company.findAll()
	const companyMap = new Map(companies.map((company:any) => [company.symbol, company.id]))
	
	await Promise.all(
		rows.map(async (row: cheerio.Element) => {
			const $row = $(row)
			const cols = $row.find('td')

			const companyName = cols.eq(1).text().trim()
			const symbol = cols.eq(2).text().trim()

			const priceText = cols.eq(4).text().trim().replace(/,/g, '')
			const price = parseFloat(priceText)

			// 漲跌幅處理：Ex "(1.02%)" -> "1.02"
			const dayChgText = cols.eq(6).text().trim().replace(/[()%]/g, '')
			const dayChg = parseFloat(dayChgText)

			const weightRaw = cols.eq(3).text().trim().replace('%', '');
			const weight = _.toNumber(weightRaw);

			let company_id = companyMap.get(symbol)
			if (!company_id) {
                const [companyInstance] = await db.Company.findOrCreate({
                    where: { symbol },
                    defaults: { name: companyName }
                });
                company_id = companyInstance.id;
                // 選做：更新 map 以免同批次重複查詢 DB
                companyMap.set(symbol, company_id);
            }

			stockPrices.push({
				company_id: company_id as number,
				price,
				dayChg,
				date: pageDate,
				timestamp,
				weight
			})
		})
	)

	return stockPrices
}

export async function crawlStockPrices(): Promise<void> {
	try {
		const url: string | undefined = process.env.STOCK_PRICES_URL
		if (!url) {
			logger.error('STOCK_PRICES_URL沒有定義！')
			return
		}
		const resp = await axios.get(url, { responseType: 'arraybuffer' })
		const html = decodeBuffer(resp.data)
		const stockPrices = await extractDataFromHtml(html)

		if (!stockPrices.length) {
			logger.info('No new stock prices to insert.')
			return
		}
		await db.StockPrice.bulkCreate(stockPrices)
		logger.info(`成功創建 ${stockPrices.length} stock prices.`)
	} catch (e: any) {
		logger.error(`Error: ${(e as Error)}`)
	}
}
