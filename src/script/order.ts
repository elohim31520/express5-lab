import axios from 'axios'

interface OrderItem {
	productId: string
	quantity: number
}

interface OrderData {
	items: OrderItem[]
	userId: string
}

const baseURL: string = 'http://localhost:3001'

async function testOrderAPI(orderData: OrderData) {
	try {
		console.log('🚀 開始測試訂單 API...')

		const response = await axios.post(`${baseURL}/order`, orderData)

		console.log('✅ 訂單請求成功!')
		console.log('📊 回應狀態:', response.status)
		console.log('📝 回應資料:', response.data)
	} catch (error: any) {
		console.error('❌ 訂單請求失敗:')

		if (error.response) {
			// 伺服器回應錯誤
			console.error('狀態碼:', error.response.status)
			console.error('錯誤訊息:', error.response.data)
		} else if (error.request) {
			// 網路錯誤
			console.error('網路錯誤:', error.message)
		} else {
			// 其他錯誤
			console.error('錯誤:', error.message)
		}
	}
}

export async function placeOrder(orderData: OrderData) {
	try {
		const response = await axios.post(`${baseURL}/order`, orderData)
		console.log(`✅ 訂單成功: ${response.data.id || 'unknown'}`)
		return response.data
	} catch (error: any) {
		// --- 修改這裡：打印更詳細的資訊 ---
		if (error.response) {
			// 伺服器有回傳，但狀態碼不是 2xx (例如 400, 404, 500)
			console.error(`❌ API 報錯 (${error.response.status}):`, error.response.data)
		} else if (error.request) {
			// 請求發出了，但沒收到回應 (伺服器可能卡死或重啟中)
			console.error(`❌ 伺服器無回應 (No Response):`, error.code)
		} else {
			// 設定請求時發生錯誤
			console.error(`❌ 請求設定錯誤:`, error.message)
		}
		throw error
	}
}