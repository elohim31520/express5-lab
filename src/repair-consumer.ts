import amqp from "amqplib";

async function startRepairConsumer() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    const FAILED_QUEUE = "order_failed";
    const MAIN_QUEUE = "order_tasks";

    await channel.assertQueue(FAILED_QUEUE);

    console.log(`[*] 救援小組已就位，正在監聽失敗隊列: ${FAILED_QUEUE}`);

    channel.consume(FAILED_QUEUE, (msg) => {
      if (msg !== null) {
        const order = JSON.parse(msg.content.toString());

        // --- 核心邏輯：分析錯誤 ---
        // RabbitMQ 會在 Header 裡自動加入死信原因
        const deathInfo = msg.properties.headers?.["x-death"];
        const reason = deathInfo ? deathInfo[0].reason : "未知原因";

        console.log("------------------------------------------");
        console.log(`[⚠️ 偵測到失敗訂單] 商品: ${order.productName}`);
        console.log(`[原因] ${reason}`);

        // --- 救援策略：假設我們現在修好了「洗衣機」的 Bug ---

        console.log(
          `[🛠️ 修復中] 正在為 ${order.productName} 重新打包並送回主隊列...`
        );

        // 模擬修正資料內容 (例如加上修復標記)
        order.repaired = true;
        order.repairTime = new Date().toISOString();

        // 重新發回主隊列，讓 main consumer 再試一次
        channel.sendToQueue(MAIN_QUEUE, Buffer.from(JSON.stringify(order)));

        console.log(`[🚀 救援成功] 訊息已重回 ${MAIN_QUEUE}`);

        // 處理完畢後要 ack，讓它從失敗隊列中消失
        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("救援消費者發生錯誤:", error);
  }
}
