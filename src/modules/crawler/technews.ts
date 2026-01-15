import axios from 'axios'
const cheerio = require('cheerio')
import _ from 'lodash'
require('dotenv').config()

import { TC_HEADER } from '../../constant/config'
import { zhTimeStringToStandard, normalizeDate } from '../date'

const logger = require('../../logger')
const db = require('../../../models')

interface Article {
	title: string
	web_url: string
	release_time: string
	publisher?: string
}

interface News {
	content: string
	publishedAt: Date
}

function extractDataFromHtml(html: string): News[] {
	const $ = cheerio.load(html)
	const arr: News[] = []

	$('table').each((index: number, element: cheerio.Element) => {
		let title = $(element).find('.maintitle h1.entry-title a').text()
		let web_url = $(element).find('.maintitle h1.entry-title a').attr('href') || ''
		let release_time = $(element).find('.head:contains("發布日期")').next().text()
		// let publisher = $(element).find('.head:contains("作者")').next().text()

		if (title) {
			title = title.trim()
			web_url = web_url.trim()
			release_time = zhTimeStringToStandard(release_time)
			arr.push({ content: title, publishedAt: release_time })
		}
	})

	return arr.reverse()
}

function getTechNewsUrl(page: number): string {
	if (page <= 0) {
		return process.env.TECHNEWS_URL || ''
	}
	return `${process.env.TECHNEWS_URL}page/${page}/`
}

async function fetchTechNews(page: number): Promise<News[]> {
	const techUrl = getTechNewsUrl(page)
	const res = await axios.get(techUrl, { headers: TC_HEADER })
	const data = _.get(res, 'data', {})
	return extractDataFromHtml(data)
}

export async function crawlTechNews(): Promise<void> {
	const totalPage = 5
	const sleepTime = 10 * 1000

	try {
		for (let page = totalPage; page >= 0; page--) {
			console.log(`正在爬取第 ${page} 頁...`)
			let arr = await fetchTechNews(page)

			if (!arr.length) {
				logger.warn(`第 ${page} 頁沒解析出資料，跳過。`)
				continue
			}

			for (const article of arr) {
				const parsedDate = normalizeDate(article.publishedAt)
				if (!parsedDate) {
					console.warn(`publishedAt格式錯誤: ${article.publishedAt}`)
					continue
				}

				try {
					await db.News.create({ ...article, publishedAt: parsedDate })
				} catch (innerError: any) {
					if (innerError.name === 'SequelizeUniqueConstraintError') {
						console.log(`文章已存在 (跳過): ${article.content}`)
					}
				}
			}

			await new Promise((resolve) => setTimeout(resolve, sleepTime))
		}
	} catch (e: any) {
		console.error('爬蟲主流程發生嚴重錯誤:', (e as Error).message)
	}
}
