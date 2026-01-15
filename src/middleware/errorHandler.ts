import { Request, Response, NextFunction } from 'express';
import { AppError, AuthError, ClientError } from '../modules/errors';
import errorCodes from '../constant/errorCodes';

// 定義 Handler 的介面
interface ErrorMatcher {
    matches: (err: any) => boolean;
    handle: (err: any, res: Response) => void;
}

const errorHandlers: ErrorMatcher[] = [
    {
        matches: (err) => err instanceof AuthError,
        handle: (err, res) => {
            res.status(401).json({ success: false, code: 401, message: err.message });
        },
    },
    {
        matches: (err) => err instanceof ClientError,
        handle: (err, res) => {
            res.status(400).json({ success: false, code: 400, message: err.message });
        },
    },
    // --- Drizzle / Postgres 專屬處理 ---
    {
        // Postgres 唯一約束衝突 (例如 email 重複)，錯誤碼通常是 '23505'
        matches: (err) => err.code === '23505' || err.message?.includes('unique constraint'),
        handle: (err, res) => {
            res.status(409).json({ 
                success: false, 
                code: errorCodes.DUPLICATE_ACCOUNT.code, 
                message: "資料已存在" 
            });
        },
    },
    {
        // 處理 Drizzle 資料型態錯誤 (例如 UUID 格式不對)
        matches: (err) => err.message?.includes('invalid input syntax for type uuid'),
        handle: (err, res) => {
            res.status(400).json({ success: false, code: 400, message: "無效的 ID 格式" });
        },
    }
];

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('💥 Error Caught:', {
        name: err.name,
        message: err.message,
        code: err.code, // Postgres 錯誤通常有這個欄位
        path: req.path,
    });

    if (res.headersSent) {
        return next(err);
    }

    // 3. 尋找匹配的處理器
    for (const handler of errorHandlers) {
        if (handler.matches(err)) {
            return handler.handle(err, res);
        }
    }

    // 4. 未預期的錯誤 (預設 500)
    res.status(500).json({
        success: false,
        code: errorCodes.SERVER_ERROR.code,
        message: "伺服器內部錯誤"
    });
};

export default errorHandler;