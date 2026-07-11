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

  // For each item, fetch the current rate and insert into OrderDetails and TableOrders
  for (const item of items) {
    const itemIdInt = parseInt(item.menuItemId, 10);
    
    const itemQuery = await pool.request()
      .input("itemId", sql.Int, itemIdInt)
      .input("OutletID", sql.Int, 1) // Default to 1
      .query(`
        SELECT TOP 1 m.ItemName, COALESCE(r.Rate, m.Price) AS ActivePrice 
        FROM MenuItems m
        LEFT JOIN ItemRates r ON m.ItemID = r.ItemID AND r.OutletID = @OutletID
        WHERE m.ItemID = @itemId
      `);
      
    if (itemQuery.recordset.length === 0) continue;
    const itemData = itemQuery.recordset[0];
    const amount = (itemData.ActivePrice || 0) * item.quantity;

    await pool.request()
      .input("orderId", sql.Int, orderIdInt)
      .input("itemId", sql.Int, itemIdInt)
      .input("qty", sql.Int, item.quantity)
      .input("price", sql.Decimal(18, 2), itemData.ActivePrice || 0)
      .input("amount", sql.Decimal(18, 2), amount)
      .query(`
        DECLARE @NewODID INT = (SELECT ISNULL(MAX(OrderDetailID), 0) + 1 FROM OrderDetails);

        INSERT INTO OrderDetails (OrderDetailID, OrderID, ItemID, Quantity, Price, Amount)
        VALUES (@NewODID, @orderId, @itemId, @qty, @price, @amount)
      `);
  }

  // Recalculate total
  await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`
      UPDATE Orders 
      SET TotalAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
      WHERE OrderID = @orderId;
      
      UPDATE RestaurantTables 
      SET CurrentAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
      WHERE TableID = (SELECT TableID FROM Orders WHERE OrderID = @orderId);
    `);

  // Fetch updated order
  const result = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`SELECT * FROM Orders WHERE OrderID = @orderId`);
    
  const orderRecord = result.recordset[0];
  
  // Fetch items
  const details = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`
      SELECT od.*, i.ItemName 
      FROM OrderDetails od
      LEFT JOIN MenuItems i ON od.ItemID = i.ItemID
      WHERE od.OrderID = @orderId
    `);

  return {
    id: orderRecord.OrderID.toString(),
    restaurantId: "1",
    tableId: orderRecord.TableID?.toString() || "",
    staffId: orderRecord.StewardID || "",
    status: orderRecord.IsPaid ? "paid" : "open",
    total: orderRecord.TotalAmount || 0,
    items: details.recordset.map(od => ({
      id: od.OrderDetailID.toString(),
      orderId: orderRecord.OrderID.toString(),
      menuItemId: od.ItemID?.toString() || "",
      quantity: od.Quantity || 0,
      priceEach: od.Price || 0,
      price: od.Price || 0,
      name: od.ItemName || "Item",
      kotStatus: "pending",
      menuItem: { name: od.ItemName || "Item" }
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
