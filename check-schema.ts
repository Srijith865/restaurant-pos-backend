import { getDb } from "./src/lib/db";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const pool = await getDb();
    const result = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME IN ('Waiters', 'KOTAuditLog')
    `);
    console.dir(result.recordset, { depth: null, maxArrayLength: null });
    process.exit(0);
}

main().catch(console.error);
