import { getDb, sql } from "../lib/db";


// Extract types to a separate file or define them here for simplicity
export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  staffId: string;
  status: "open" | "billed" | "paid" | "cancelled";
  total: number;
  items: any[];
  table?: { id: string; label: string };
}

export async function getOrCreateOpenOrder(
  restaurantId: string,
  tableId: string,
  staffId: string
): Promise<Order> {
  const pool = await getDb();
  const tableIdInt = parseInt(tableId, 10);

  // Check for existing open order
  let result = await pool.request()
    .input("tableId", sql.Int, tableIdInt)
    .query(`SELECT TOP 1 * FROM Orders WHERE TableID = @tableId AND (IsPaid = 0 OR IsPaid IS NULL) ORDER BY OrderID DESC`);

  let orderRecord = result.recordset[0];

  if (!orderRecord) {
    // Create new order
    const insertResult = await pool.request()
      .input("tableId", sql.Int, tableIdInt)
      .input("staffId", sql.VarChar, staffId)
      .input("date", sql.DateTime, new Date())
      .query(`
        DECLARE @NewOrderID INT = (SELECT ISNULL(MAX(OrderID), 0) + 1 FROM Orders);

        INSERT INTO Orders (OrderID, TableID, StewardID, OrderDate, TotalAmount, IsKOTRaised, IsPaid)
        VALUES (@NewOrderID, @tableId, CAST(@staffId AS INT), @date, 0, 0, 0);
        
        SELECT @NewOrderID AS OrderID;
        
        UPDATE RestaurantTables SET Status = 'Occupied', OccupiedSince = @date WHERE TableID = @tableId;
      `);
    
    // SCOPE_IDENTITY() returns the ID in the first recordset
    const newOrderId = insertResult.recordset[0].OrderID;
    
    // Fetch the newly created order
    const newOrderResult = await pool.request()
      .input("orderId", sql.Int, newOrderId)
      .query(`SELECT TOP 1 * FROM Orders WHERE OrderID = @orderId`);
      
    orderRecord = newOrderResult.recordset[0];
  }

  return {
    id: orderRecord.OrderID.toString(),
    restaurantId: "1",
    tableId: orderRecord.TableID.toString(),
    staffId: orderRecord.StewardID || "",
    status: "open",
    total: orderRecord.TotalAmount || 0,
    items: [],
  };
}

export async function addItemsToOrder(
  restaurantId: string,
  orderId: string,
  items: { menuItemId: string; quantity: number; notes?: string; }[]
): Promise<Order> {
  const pool = await getDb();
  const orderIdInt = parseInt(orderId, 10);

  if (items.length === 0) {
    // If no items to add, just return the order details
    const result = await pool.request()
      .input("orderId", sql.Int, orderIdInt)
      .query(`
        SELECT * FROM Orders WHERE OrderID = @orderId;
        
        SELECT 
          od.OrderDetailID,
          od.ItemID,
          od.Quantity,
          od.Price,
          od.Amount,
          m.ItemName,
          (SELECT TOP 1 narration FROM TempOrder t WHERE t.itemid = od.ItemID AND t.OrderTime >= DATEADD(minute, -5, GETDATE()) ORDER BY t.TempID DESC) as notes
        FROM OrderDetails od
        JOIN MenuItems m ON od.ItemID = m.ItemID
        WHERE od.OrderID = @orderId;
      `);
      
    const orderRecord = result.recordsets[0][0];
    const orderDetails = result.recordsets[1];
    
    return {
      id: orderRecord.OrderID.toString(),
      restaurantId,
      tableId: orderRecord.TableID.toString(),
      staffId: orderRecord.StewardID.toString(),
      status: orderRecord.IsPaid ? "paid" : "open",
      total: orderRecord.TotalAmount || 0,
      items: orderDetails.map((row: any) => ({
        id: row.OrderDetailID.toString(),
        menuItemId: row.ItemID.toString(),
        name: row.ItemName,
        quantity: row.Quantity,
        price: row.Price,
        notes: row.notes || undefined,
      })),
    };
  }

  // Trip 1: Fetch Order Info and Item Prices in ONE query!
  const itemIds = items.map(i => parseInt(i.menuItemId, 10));
  const trip1Request = pool.request();
  trip1Request.input("orderId", sql.Int, orderIdInt);
  
  const trip1Query = `
    SELECT o.TableID, o.StewardID, rt.OutletID, rt.TableNumber 
    FROM Orders o
    LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID
    WHERE o.OrderID = @orderId;

    DECLARE @OutletID INT = (SELECT TOP 1 rt.OutletID FROM Orders o LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID WHERE o.OrderID = @orderId);

    SELECT m.ItemID, m.ItemName, COALESCE(r.Rate, m.Price) AS ActivePrice 
    FROM MenuItems m
    LEFT JOIN ItemRates r ON m.ItemID = r.ItemID AND r.OutletID = ISNULL(@OutletID, 1)
    WHERE m.ItemID IN (${itemIds.join(',')});
  `;

  const trip1Result = await trip1Request.query(trip1Query);
  const infoRecord = trip1Result.recordsets[0][0];
  const pricesRecords = trip1Result.recordsets[1];

  let outletId = 1;
  let tableNumber = "";
  let waiterId = "";

  if (infoRecord) {
    if (infoRecord.OutletID) outletId = infoRecord.OutletID;
    if (infoRecord.TableNumber) tableNumber = infoRecord.TableNumber;
    if (infoRecord.StewardID) waiterId = infoRecord.StewardID.toString();
  }

  const priceMap = new Map<number, any>();
  for (const row of pricesRecords) {
    priceMap.set(row.ItemID, row);
  }

  // Trip 2: Unified Batch Insert, Update Totals, and Fetch Result
  const trip2Request = pool.request();
  trip2Request.input("orderId", sql.Int, orderIdInt);
  trip2Request.input("tableNumber", sql.VarChar, tableNumber);
  trip2Request.input("waiterId", sql.VarChar, waiterId);
  trip2Request.input("now", sql.DateTime, new Date());

  let sqlBatch = `DECLARE @CurrentMax INT = (SELECT ISNULL(MAX(OrderDetailID), 0) FROM OrderDetails);\n`;
  let itemsInserted = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemIdInt = parseInt(item.menuItemId, 10);
    const itemData = priceMap.get(itemIdInt);
    if (!itemData) continue;

    const amount = (itemData.ActivePrice || 0) * item.quantity;
    
    trip2Request.input(`itemId_${i}`, sql.Int, itemIdInt);
    trip2Request.input(`qty_${i}`, sql.Int, item.quantity);
    trip2Request.input(`price_${i}`, sql.Decimal(18, 2), itemData.ActivePrice || 0);
    trip2Request.input(`amount_${i}`, sql.Decimal(18, 2), amount);
    trip2Request.input(`itemName_${i}`, sql.VarChar, itemData.ItemName);
    trip2Request.input(`notes_${i}`, sql.VarChar, item.notes || "");

    sqlBatch += `
      SET @CurrentMax = @CurrentMax + 1;
      INSERT INTO OrderDetails (OrderDetailID, OrderID, ItemID, Quantity, Price, Amount)
      VALUES (@CurrentMax, @orderId, @itemId_${i}, @qty_${i}, @price_${i}, @amount_${i});

      INSERT INTO TempOrder (TableNumber, WaiterID, ItemName, Qty, Rate, Amount, OrderTime, IsKOTPrinted, itemid, narration)
      VALUES (@tableNumber, @waiterId, @itemName_${i}, @qty_${i}, @price_${i}, @amount_${i}, @now, 0, @itemId_${i}, @notes_${i});
    `;
    itemsInserted++;
  }

  if (itemsInserted > 0) {
    sqlBatch += `
      UPDATE Orders 
      SET TotalAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
      WHERE OrderID = @orderId;
      
      UPDATE RestaurantTables 
      SET CurrentAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
      WHERE TableID = (SELECT TableID FROM Orders WHERE OrderID = @orderId);
    `;
  }

  // Always fetch updated order at the end of Trip 2
  sqlBatch += `
    SELECT * FROM Orders WHERE OrderID = @orderId;
    
    SELECT 
      od.OrderDetailID,
      od.ItemID,
      od.Quantity,
      od.Price,
      od.Amount,
      m.ItemName,
      (SELECT TOP 1 narration FROM TempOrder t WHERE t.itemid = od.ItemID AND t.OrderTime >= DATEADD(minute, -5, GETDATE()) ORDER BY t.TempID DESC) as notes
    FROM OrderDetails od
    JOIN MenuItems m ON od.ItemID = m.ItemID
    WHERE od.OrderID = @orderId;
  `;

  const finalResult = await trip2Request.query(sqlBatch);
  
  const recordsetsCount = finalResult.recordsets.length;
  const orderRecord = finalResult.recordsets[recordsetsCount - 2][0];
  const orderDetails = finalResult.recordsets[recordsetsCount - 1];

  return {
    id: orderRecord.OrderID.toString(),
    restaurantId,
    tableId: orderRecord.TableID.toString(),
    staffId: orderRecord.StewardID.toString(),
    status: orderRecord.IsPaid ? "paid" : "open",
    total: orderRecord.TotalAmount || 0,
    items: orderDetails.map((row: any) => ({
      id: row.OrderDetailID.toString(),
      menuItemId: row.ItemID.toString(),
      name: row.ItemName,
      quantity: row.Quantity,
      price: row.Price,
      notes: row.notes || undefined,
    })),
  };
}

export async function updateKotStatus(restaurantId: string, orderId: string, itemId: string, status: string) {
  // Not implemented in DB schema for KOT statuses per item.
  // We can just return the order for now.
  const pool = await getDb();
  // Fetch order
  const result = await pool.request()
    .input("orderId", sql.Int, parseInt(orderId, 10))
    .query(`SELECT * FROM Orders WHERE OrderID = @orderId`);
  
  if (result.recordset.length === 0) throw { status: 404, message: "Order not found" };
  const orderRecord = result.recordset[0];
  
  return {
    id: orderRecord.OrderID.toString(),
    restaurantId: "1",
    tableId: orderRecord.TableID?.toString() || "",
    staffId: orderRecord.StewardID || "",
    status: orderRecord.IsPaid ? "paid" : "open",
    total: orderRecord.TotalAmount || 0,
    items: [],
  };
}

export async function generateBill(restaurantId: string, orderId: string) {
  return await updateKotStatus(restaurantId, orderId, "", "");
}

export async function markOrderPaid(restaurantId: string, orderId: string, paymentMethod: string) {
  const pool = await getDb();
  await pool.request()
    .input("orderId", sql.Int, parseInt(orderId, 10))
    .query(`
      UPDATE Orders SET IsPaid = 1 WHERE OrderID = @orderId;
      UPDATE RestaurantTables SET Status = 'Available', CurrentAmount = 0 
      WHERE TableID = (SELECT TableID FROM Orders WHERE OrderID = @orderId);
    `);
  return await updateKotStatus(restaurantId, orderId, "", "");
}

export async function cancelOrder(restaurantId: string, orderId: string, reason?: string) {
  const pool = await getDb();
  await pool.request()
    .input("orderId", sql.Int, parseInt(orderId, 10))
    .query(`
      DELETE FROM OrderDetails WHERE OrderID = @orderId;
      DELETE FROM Orders WHERE OrderID = @orderId;
    `);
}
