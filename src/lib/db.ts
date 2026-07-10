import sql from "mssql";

const config: sql.config = {
  user: "bteapcet_RestaurantDB",
  password: "sabt",
  server: "sql.bsite.net\\MSSQL2016", 
  database: "bteapcet_RestaurantDB",
  options: {
    encrypt: false, // for testing / development
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then((pool) => {
    console.log("Connected to MS SQL");
    return pool;
  })
  .catch((err) => {
    console.error("Database Connection Failed! Bad Config: ", err);
    throw err;
  });

export async function getDb(): Promise<sql.ConnectionPool> {
  return poolPromise;
}

export { sql };
