import { getDb, sql } from './db';

const MASTER_PASSWORD = 'bluefox2026';
const DEFAULT_PIN = '3216';

async function initSecurityTables() {
  try {
    const pool = await getDb();
    
    // Create AuthorizedDevices table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuthorizedDevices' and xtype='U')
      CREATE TABLE AuthorizedDevices (
        DeviceId VARCHAR(255) PRIMARY KEY,
        CreatedAt DATETIME DEFAULT GETDATE()
      )
    `);

    // Create WaiterPins table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WaiterPins' and xtype='U')
      CREATE TABLE WaiterPins (
        WaiterId VARCHAR(255) PRIMARY KEY,
        Pin VARCHAR(255) NOT NULL,
        UpdatedAt DATETIME DEFAULT GETDATE()
      )
    `);
  } catch (err) {
    console.error('Failed to initialize security tables', err);
  }
}

// Fire and forget initialization
initSecurityTables();

export async function isDeviceAuthorized(deviceId: string): Promise<boolean> {
  if (!deviceId) return false;
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("deviceId", sql.VarChar, deviceId)
      .query(`SELECT DeviceId FROM AuthorizedDevices WHERE DeviceId = @deviceId`);
    return result.recordset.length > 0;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function authorizeDevice(deviceId: string, masterPassword: string): Promise<boolean> {
  if (masterPassword !== MASTER_PASSWORD) {
    return false;
  }
  try {
    const pool = await getDb();
    await pool.request()
      .input("deviceId", sql.VarChar, deviceId)
      .query(`
        IF NOT EXISTS (SELECT * FROM AuthorizedDevices WHERE DeviceId = @deviceId)
        INSERT INTO AuthorizedDevices (DeviceId) VALUES (@deviceId)
      `);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function verifyWaiterPin(waiterId: string, pin: string): Promise<boolean> {
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("waiterId", sql.VarChar, waiterId)
      .query(`SELECT Pin FROM WaiterPins WHERE WaiterId = @waiterId`);
      
    if (result.recordset.length > 0) {
      return result.recordset[0].Pin === pin;
    } else {
      // If no custom PIN exists in the table, use DEFAULT_PIN
      return pin === DEFAULT_PIN;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function setWaiterPin(waiterId: string, newPin: string) {
  try {
    const pool = await getDb();
    await pool.request()
      .input("waiterId", sql.VarChar, waiterId)
      .input("pin", sql.VarChar, newPin)
      .query(`
        IF EXISTS (SELECT * FROM WaiterPins WHERE WaiterId = @waiterId)
          UPDATE WaiterPins SET Pin = @pin, UpdatedAt = GETDATE() WHERE WaiterId = @waiterId
        ELSE
          INSERT INTO WaiterPins (WaiterId, Pin) VALUES (@waiterId, @pin)
      `);
  } catch (err) {
    console.error(err);
  }
}
