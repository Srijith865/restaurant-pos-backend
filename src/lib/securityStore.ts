import { getDb, sql } from './db';

const DEFAULT_PIN = '3216';

async function initSecurityTables() {
  try {
    const pool = await getDb();
    
    // Create AuthorizedDevices table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuthorizedDevices' and xtype='U')
      BEGIN
        CREATE TABLE AuthorizedDevices (
          DeviceId VARCHAR(255) PRIMARY KEY,
          IsApproved BIT DEFAULT 0,
          CreatedAt DATETIME DEFAULT GETDATE()
        )
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsApproved' AND Object_ID = Object_ID(N'AuthorizedDevices'))
        BEGIN
            ALTER TABLE AuthorizedDevices ADD IsApproved BIT DEFAULT 0;
        END
      END
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

export async function getDeviceStatus(deviceId: string): Promise<{ exists: boolean, isApproved: boolean }> {
  if (!deviceId) return { exists: false, isApproved: false };
  try {
    const pool = await getDb();
    const result = await pool.request()
      .input("deviceId", sql.VarChar, deviceId)
      .query(`SELECT IsApproved FROM AuthorizedDevices WHERE DeviceId = @deviceId`);
    
    if (result.recordset.length > 0) {
      return { exists: true, isApproved: !!result.recordset[0].IsApproved };
    }
    return { exists: false, isApproved: false };
  } catch (err) {
    console.error(err);
    return { exists: false, isApproved: false };
  }
}

export async function registerDevice(deviceId: string): Promise<boolean> {
  try {
    const pool = await getDb();
    await pool.request()
      .input("deviceId", sql.VarChar, deviceId)
      .query(`
        IF NOT EXISTS (SELECT * FROM AuthorizedDevices WHERE DeviceId = @deviceId)
        INSERT INTO AuthorizedDevices (DeviceId, IsApproved) VALUES (@deviceId, 0)
      `);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function getAllDevices() {
  try {
    const pool = await getDb();
    const result = await pool.request().query(`
      SELECT DeviceId, IsApproved, CreatedAt 
      FROM AuthorizedDevices 
      ORDER BY CreatedAt DESC
    `);
    return result.recordset;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function setDeviceApproval(deviceId: string, isApproved: boolean) {
  try {
    const pool = await getDb();
    await pool.request()
      .input("deviceId", sql.VarChar, deviceId)
      .input("isApproved", sql.Bit, isApproved ? 1 : 0)
      .query(`
        UPDATE AuthorizedDevices SET IsApproved = @isApproved WHERE DeviceId = @deviceId
      `);
  } catch (err) {
    console.error(err);
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
