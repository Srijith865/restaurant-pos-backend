import sql from "mssql";

const config: sql.config = {
  user: "bteapcet_RestaurantDB",
  password: "sabt",
  server: "sql.bsite.net\\MSSQL2016", 
  database: "bteapcet_RestaurantDB",
  connectionTimeout: 45000,
  requestTimeout: 45000,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 15,
    min: 1, // keep 1 warm connection so queries don't suffer TDS handshake latency
    idleTimeoutMillis: 60000,
  },
};

let pool: sql.ConnectionPool | null = null;
let connectingPromise: Promise<sql.ConnectionPool> | null = null;

export async function getDb(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    try {
      if (pool) {
        try {
          await pool.close();
        } catch (_) {}
        pool = null;
      }

      const newPool = new sql.ConnectionPool(config);
      newPool.on("error", (err) => {
        console.error("MSSQL Pool background error (will auto-reconnect on next query):", err.message);
        pool = null;
      });

      await newPool.connect();
      console.log("Connected to MS SQL successfully");
      pool = newPool;
      return pool;
    } catch (err) {
      console.error("Database connection attempt failed:", err);
      pool = null;
      throw err;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

export { sql };

