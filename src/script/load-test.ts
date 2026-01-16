import { Worker } from 'worker_threads'
import path from 'path'
import { fileURLToPath } from 'url'

interface LoadTestOptions {
	workerCount: number
	ordersPerWorker: number
	delayBetweenOrders: number // 毫秒
}

async function runLoadTest(options: LoadTestOptions) {
    const { workerCount, ordersPerWorker, delayBetweenOrders } = options

    console.log(`🚀 開始負載測試:`)
    console.log(`   - Worker 數量: ${workerCount}`)
    console.log(`   - 每個 Worker 的訂單數: ${ordersPerWorker}`)
    console.log(`   - 總計預期訂單數: ${workerCount * ordersPerWorker}\n`)

    const workers: Worker[] = []
    const results = {
        completed: 0,
        failed: 0,
        totalOrders: workerCount * ordersPerWorker,
    }

    // --- 關鍵改進：記錄真實開始時間 ---
    const startTime = performance.now()

    // 確定 Worker 檔案路徑 (如果是 ts-node 執行，可能需要指向 .ts；編譯後則指向 .js)
    const workerPath = path.join(__dirname, 'worker.ts') 

    for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(workerPath, {
            // 如果是用 ts-node 執行，需要告訴 Worker 怎麼解析 TS
            // execArgv: /\.ts$/.test(workerPath) ? ['--loader', 'ts-node/esm'] : [],
            workerData: {
                workerId: i + 1,
                ordersPerWorker,
                delayBetweenOrders,
            },
            execArgv: ['--import', 'tsx']
        })

        worker.on('message', (message) => {
            if (message.type === 'order_completed') {
                results.completed++
            } else if (message.type === 'order_failed') {
                results.failed++
            }
            
            // 抽離出進度顯示邏輯
            const currentTotal = results.completed + results.failed
            const percentage = Math.round((currentTotal / results.totalOrders) * 100)
            // 使用 \r 可以讓終端機在同一行更新，不會洗版
            process.stdout.write(`\r📊 進度: ${currentTotal}/${results.totalOrders} (${percentage}%)`)
        })

        worker.on('error', (error) => {
            console.error(`\n❌ Worker ${i + 1} 發生嚴重錯誤:`, error)
        })

        workers.push(worker)
    }

    // 等待所有 worker 完成
    await Promise.all(workers.map(w => new Promise(resolve => w.on('exit', resolve))))

    const endTime = performance.now()
    const actualDurationSeconds = (endTime - startTime) / 1000

    // 輸出最終結果
    console.log('\n\n🎯 負載測試完成!')
    console.log(`--------------------------`)
    console.log(`✅ 成功訂單: ${results.completed}`)
    console.log(`❌ 失敗訂單: ${results.failed}`)
    console.log(`📊 成功率: ${((results.completed / results.totalOrders) * 100).toFixed(2)}%`)
    console.log(`⏱️ 實際總耗時: ${actualDurationSeconds.toFixed(2)} 秒`)
    console.log(`⚡ 實際平均吞吐量 (RPS): ${(results.completed / actualDurationSeconds).toFixed(2)} orders/s`)
}

// 從命令行參數獲取配置
function getOptionsFromArgs(): LoadTestOptions {
	const args = process.argv.slice(2)

	// 默認配置
	const defaults: LoadTestOptions = {
		workerCount: 100,
		ordersPerWorker: 400,
		delayBetweenOrders: 1000, // 1秒
	}

	// 解析命令行參數
	const parsed = args.reduce((acc, arg, index) => {
		if (arg === '--workers' && args[index + 1]) {
			acc.workerCount = parseInt(args[index + 1])
		} else if (arg === '--orders' && args[index + 1]) {
			acc.ordersPerWorker = parseInt(args[index + 1])
		} else if (arg === '--delay' && args[index + 1]) {
			acc.delayBetweenOrders = parseInt(args[index + 1])
		}
		return acc
	}, defaults)

	return parsed
}

// 主函數
async function main() {
	try {
		const options = getOptionsFromArgs()

		// 驗證參數
		if (options.workerCount < 1 || options.workerCount > 100) {
			console.error('❌ Worker 數量必須在 1-100 之間')
			process.exit(1)
		}

		if (options.ordersPerWorker < 1 || options.ordersPerWorker > 1000) {
			console.error('❌ 每個 Worker 的訂單數必須在 1-1000 之間')
			process.exit(1)
		}

		if (options.delayBetweenOrders < 100 || options.delayBetweenOrders > 10000) {
			console.error('❌ 訂單間隔必須在 100-10000ms 之間')
			process.exit(1)
		}

		await runLoadTest(options)
	} catch (error) {
		console.error('❌ 負載測試失敗:', error)
		process.exit(1)
	}
}

// 如果直接運行此腳本
if (require.main === module) {
	main()
}

export { runLoadTest, LoadTestOptions }
