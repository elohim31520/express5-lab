import axios from 'axios'
const cheerio = require('cheerio')
import _ from 'lodash'
require('dotenv').config()

import { MARKET_INDEX_HEADERS } from '../../constant/config'
const { BTCUSD, USOIL, DXY, US10Y, XAUUSD } = require('../../constant/market')
import { decodeBuffer } from '../util'
const logger = require('../../logger')
const db = require('../../../models')

interface MarketData {
	asset_id: number
	price: number
	change: number
}

function extractDataFromHtml($: cheerio.CheerioAPI, symbol: string, assetId: number): MarketData | null {
	let selector: string

	if (symbol === USOIL) {
		selector = `tr[data-symbol="CL1:COM"]`
	} else if (symbol === US10Y) {
		selector = 'tr[data-symbol="USGG10YR:IND"]'
	} else {
		selector = `tr[data-symbol="${symbol}:CUR"]`
	}
	const row = $(selector)
	if (!row.length) return null

	const val = row.find('td#p').text().trim()
	const chValue = row.find('td#pch').text().trim().replace('%', '')

	const price = parseFloat(val)
	const change = parseFloat(chValue)

	if (isNaN(price) || isNaN(change)) return null

	return {
		asset_id: assetId,
		price,
		change,
	}
}

export async function crawlMarketIndex(): Promise<void> {
	const url = process.env.MARKET_URL

	if (!url) {
		logger.error('MARKET_URL環境變數沒定義！')
		return
	}

	try {
		const res = await axios.get(url, { headers: MARKET_INDEX_HEADERS })
		const htmlContent = decodeBuffer(res.data)
		const $ = cheerio.load(htmlContent)

		const assets = await db.Asset.findAll()
		const results: MarketData[] = []

		for (const asset of assets) {
			const data = extractDataFromHtml($, asset.symbol, asset.id)

			if (data) {
				results.push(data)
			} else {
				logger.warn(`無法抓取標的數據: ${asset.symbol}`)
			}
		}

		if (results.length > 0) {
			await db.MarketIndex.bulkCreate(results)
		}
	} catch (e: any) {
		logger.error(`Error: ${(e as Error)}`)
	}
}
