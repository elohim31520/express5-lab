const redis = require('redis');

// 創建 Redis 客戶端
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// 錯誤處理
redisClient.on('error', (err: Error) => {
    console.error('Redis 客戶端錯誤:', err);
});

redisClient.on('connect', () => {
    console.log('Redis 客戶端連接成功');
});

export default redisClient; 