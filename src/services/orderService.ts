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
        SET NOCOUNT ON;
        DECLARE @NewOrderID INT = (SELECT ISNULL(MAX(OrderID), 0) + 1 FROM Orders);

        INSERT INTO Orders (OrderID, TableID, StewardID, OrderDate, TotalAmount, IsKOTRaised, IsPaid)
        VALUES (@NewOrderID, @tableId, CAST(@staffId AS INT), @date, 0, 0, 0);
        
        UPDATE RestaurantTables SET Status = 'Occupied', OccupiedSince = @date WHERE TableID = @tableId;

        SELECT @NewOrderID AS OrderID;
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
          (SELECT TOP 1 narration FROM TempOrder t WHERE t.itemid = od.ItemID AND t.OrderTime >= DATEADD(minute, -5, GETDATE()) ORDER BY t.OrderTime DESC) as notes
        FROM OrderDetails od
        JOIN MenuItems m ON od.ItemID = m.ItemID
        WHERE od.OrderID = @orderId;
      `);
      
    const recordsets = result.recordsets as any[][];
    const orderRecord = recordsets[0][0];
    const orderDetails = recordsets[1];
    
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

  // Trip 1 & 2 Combined: The God Script
  const tripRequest = pool.request();
  tripRequest.input("orderId", sql.Int, orderIdInt);
  tripRequest.input("now", sql.DateTime, new Date());

  let sqlBatch = `
    SET NOCOUNT ON;
    
    DECLARE @TableID INT, @StewardID VARCHAR(50), @OutletID INT, @TableNumber VARCHAR(50);
    
    SELECT TOP 1 
      @TableID = o.TableID, 
      @StewardID = ISNULL(CAST(o.StewardID AS VARCHAR(50)), ''), 
      @OutletID = rt.OutletID, 
      @TableNumber = ISNULL(rt.TableNumber, '')
    FROM Orders o
    LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID
    WHERE o.OrderID = @orderId;

    DECLARE @CurrentMax INT = (SELECT ISNULL(MAX(OrderDetailID), 0) FROM OrderDetails);
    DECLARE @Price DECIMAL(18,2), @ItemName VARCHAR(255), @Amount DECIMAL(18,2);
  `;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemIdInt = parseInt(item.menuItemId, 10);
    
    tripRequest.input(`itemId_${i}`, sql.Int, itemIdInt);
    tripRequest.input(`qty_${i}`, sql.Int, item.quantity);
    tripRequest.input(`notes_${i}`, sql.VarChar, item.notes || "");

    sqlBatch += `
      SELECT TOP 1 
        @Price = COALESCE(r.Rate, m.Price), 
        @ItemName = m.ItemName
      FROM MenuItems m
      LEFT JOIN ItemRates r ON m.ItemID = r.ItemID AND r.OutletID = ISNULL(@OutletID, 1)
      WHERE m.ItemID = @itemId_${i};

      IF @ItemName IS NOT NULL
      BEGIN
        SET @Amount = @Price * @qty_${i};
        SET @CurrentMax = @CurrentMax + 1;
        
        INSERT INTO OrderDetails (OrderDetailID, OrderID, ItemID, Quantity, Price, Amount)
        VALUES (@CurrentMax, @orderId, @itemId_${i}, @qty_${i}, @Price, @Amount);

        INSERT INTO TempOrder (TableNumber, WaiterID, ItemName, Qty, Rate, Amount, OrderTime, IsKOTPrinted, itemid, narration)
        VALUES (@TableNumber, @StewardID, @ItemName, @qty_${i}, @Price, @Amount, @now, 0, @itemId_${i}, @notes_${i});
      END
      
      SET @ItemName = NULL;
      SET @Price = NULL;
    `;
  }

  sqlBatch += `
    UPDATE Orders 
    SET TotalAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
    WHERE OrderID = @orderId;
    
    UPDATE RestaurantTables 
    SET CurrentAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
    WHERE TableID = @TableID;

    SELECT * FROM Orders WHERE OrderID = @orderId;
    
    SELECT 
      od.OrderDetailID,
      od.ItemID,
      od.Quantity,
      od.Price,
      od.Amount,
      m.ItemName,
      (SELECT TOP 1 narration FROM TempOrder t WHERE t.itemid = od.ItemID AND t.OrderTime >= DATEADD(minute, -5, GETDATE()) ORDER BY t.OrderTime DESC) as notes
    FROM OrderDetails od
    JOIN MenuItems m ON od.ItemID = m.ItemID
    WHERE od.OrderID = @orderId;
  `;

  const finalResult = await tripRequest.query(sqlBatch);
  
  const tripRecordsets = finalResult.recordsets as any[][];
  const recordsetsCount = tripRecordsets.length;
  const orderRecord = tripRecordsets[recordsetsCount - 2][0];
  const orderDetails = tripRecordsets[recordsetsCount - 1];

  return {
    id: orderRecord.OrderID.toString(),
    restaurantId,
    tableId: orderRecord.TableID?.toString() || "",
    staffId: orderRecord.StewardID?.toString() || "",
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
