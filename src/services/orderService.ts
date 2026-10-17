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
    
    DECLARE @TableID INT, @StewardID VARCHAR(50), @OutletID INT, @TableNumber VARCHAR(50), @OrderDate DATETIME;
    
    SELECT TOP 1 
      @TableID = o.TableID, 
      @StewardID = ISNULL(CAST(o.StewardID AS VARCHAR(50)), ''), 
      @OutletID = rt.OutletID, 
      @TableNumber = ISNULL(rt.TableNumber, ''),
      @OrderDate = o.OrderDate
    FROM Orders o
    LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID
    WHERE o.OrderID = @orderId;

    DECLARE @CurrentMax INT = (SELECT ISNULL(MAX(OrderDetailID), 0) FROM OrderDetails);
    DECLARE @Price DECIMAL(18,2), @ItemName VARCHAR(255), @Amount DECIMAL(18,2);

    -- Calculate sequential KOT Number for this table's active order session
    DECLARE @CurrentKOTNum INT = (
      SELECT ISNULL(MAX(TRY_CAST(KOTNumber AS INT)), 0) + 1 
      FROM KOTAuditLog 
      WHERE TableNumber = @TableNumber AND LogTime >= @OrderDate
    );
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

        INSERT INTO KOTAuditLog (KOTNumber, TableNumber, ItemID, ItemName, DeltaQty, KOTAction, WaiterID, OutletID, LogTime, IsPrintedToKitchen, online)
        VALUES (CAST(@CurrentKOTNum AS VARCHAR(50)), @TableNumber, @itemId_${i}, @ItemName, @qty_${i}, CASE WHEN @CurrentKOTNum = 1 THEN 'New Order' ELSE 'Add Items' END, @StewardID, @OutletID, @now, 0, 1);
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

export async function cancelOrder(restaurantId: string, orderId: string, waiterId: string, reason?: string) {
  const pool = await getDb();
  const orderIdInt = parseInt(orderId, 10);

  const orderRes = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`
      SELECT 
        o.OrderID,
        o.TableID,
        o.OrderDate,
        ISNULL(rt.TableNumber, '') as TableNumber,
        rt.OutletID
      FROM Orders o
      LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID
      WHERE o.OrderID = @orderId
    `);

  if (orderRes.recordset.length === 0) return;
  const orderInfo = orderRes.recordset[0];

  const itemsRes = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`
      SELECT od.ItemID, m.ItemName, od.Quantity 
      FROM OrderDetails od
      JOIN MenuItems m ON od.ItemID = m.ItemID
      WHERE od.OrderID = @orderId
    `);

  const kotRes = await pool.request()
    .input("table", sql.VarChar, orderInfo.TableNumber)
    .input("orderDate", sql.DateTime, orderInfo.OrderDate)
    .query(`
      SELECT ISNULL(MAX(TRY_CAST(KOTNumber AS INT)), 0) as MaxKOT
      FROM KOTAuditLog
      WHERE TableNumber = @table AND LogTime >= @orderDate
    `);
  const maxKot = kotRes.recordset[0]?.MaxKOT || 1;
  const kotNumber = (maxKot > 0 ? maxKot : 1).toString();
  const now = new Date();

  for (const item of itemsRes.recordset) {
    await pool.request()
      .input("kot", sql.VarChar, kotNumber)
      .input("table", sql.VarChar, orderInfo.TableNumber)
      .input("itemId", sql.Int, item.ItemID)
      .input("itemName", sql.VarChar, item.ItemName)
      .input("delta", sql.Int, -item.Quantity)
      .input("action", sql.VarChar, "Cancel Order")
      .input("waiter", sql.VarChar, waiterId)
      .input("outlet", sql.Int, orderInfo.OutletID)
      .input("time", sql.DateTime, now)
      .query(`
        INSERT INTO KOTAuditLog (KOTNumber, TableNumber, ItemID, ItemName, DeltaQty, KOTAction, WaiterID, OutletID, LogTime, IsPrintedToKitchen, online)
        VALUES (@kot, @table, @itemId, @itemName, @delta, @action, @waiter, @outlet, @time, 0, 1)
      `);
  }

  await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .input("tableNumber", sql.VarChar, orderInfo.TableNumber)
    .input("tableId", sql.Int, orderInfo.TableID)
    .input("orderDate", sql.DateTime, orderInfo.OrderDate)
    .query(`
      SET NOCOUNT ON;

      DELETE FROM TempOrder WHERE TableNumber = @tableNumber AND OrderTime >= @orderDate;
      DELETE FROM OrderDetails WHERE OrderID = @orderId;
      DELETE FROM Orders WHERE OrderID = @orderId;

      UPDATE RestaurantTables 
      SET Status = 'Available', CurrentAmount = 0, OccupiedSince = NULL 
      WHERE TableID = @tableId;
    `);
}

export async function updateOrderItem(restaurantId: string, orderId: string, itemId: string, quantityDelta: number, waiterId: string) {
  const pool = await getDb();
  const orderIdInt = parseInt(orderId, 10);
  const itemIdInt = parseInt(itemId, 10);

  const orderRes = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`
      SELECT 
        o.OrderID,
        o.TableID,
        o.OrderDate,
        ISNULL(rt.TableNumber, '') as TableNumber,
        rt.OutletID
      FROM Orders o
      LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID
      WHERE o.OrderID = @orderId
    `);

  if (orderRes.recordset.length === 0) throw { status: 404, message: "Order not found" };
  const orderInfo = orderRes.recordset[0];

  // Match either OrderDetailID or ItemID (since mobile client passes ItemID)
  const itemRes = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .input("itemId", sql.Int, itemIdInt)
    .query(`
      SELECT TOP 1 
        od.OrderDetailID,
        od.ItemID,
        od.Quantity,
        od.Price,
        m.ItemName
      FROM OrderDetails od
      JOIN MenuItems m ON od.ItemID = m.ItemID
      WHERE od.OrderID = @orderId 
        AND (od.OrderDetailID = @itemId OR od.ItemID = @itemId)
      ORDER BY od.OrderDetailID DESC
    `);

  if (itemRes.recordset.length === 0) throw { status: 404, message: "Item not found in order" };
  const item = itemRes.recordset[0];
  const newQty = item.Quantity + quantityDelta;

  const kotRes = await pool.request()
    .input("table", sql.VarChar, orderInfo.TableNumber)
    .input("orderDate", sql.DateTime, orderInfo.OrderDate)
    .query(`
      SELECT ISNULL(MAX(TRY_CAST(KOTNumber AS INT)), 0) as MaxKOT
      FROM KOTAuditLog
      WHERE TableNumber = @table AND LogTime >= @orderDate
    `);
  const maxKot = kotRes.recordset[0]?.MaxKOT || 1;
  const kotNumber = (maxKot > 0 ? maxKot : 1).toString();

  const updateReq = pool.request();
  updateReq.input("orderId", sql.Int, orderIdInt);
  updateReq.input("orderDetailId", sql.Int, item.OrderDetailID);
  updateReq.input("itemId", sql.Int, item.ItemID);
  updateReq.input("itemName", sql.VarChar, item.ItemName);
  updateReq.input("tableNumber", sql.VarChar, orderInfo.TableNumber);
  updateReq.input("tableId", sql.Int, orderInfo.TableID);
  updateReq.input("orderDate", sql.DateTime, orderInfo.OrderDate);
  updateReq.input("newQty", sql.Int, newQty);
  updateReq.input("qtyDelta", sql.Int, quantityDelta);
  updateReq.input("kotNumber", sql.VarChar, kotNumber);
  updateReq.input("waiterId", sql.VarChar, waiterId);
  updateReq.input("outletId", sql.Int, orderInfo.OutletID);
  updateReq.input("now", sql.DateTime, new Date());

  await updateReq.query(`
    SET NOCOUNT ON;

    -- 1. Update/Delete OrderDetails
    IF @newQty <= 0
    BEGIN
      DELETE FROM OrderDetails WHERE OrderDetailID = @orderDetailId AND OrderID = @orderId;
    END
    ELSE
    BEGIN
      UPDATE OrderDetails 
      SET Quantity = @newQty, Amount = @newQty * Price
      WHERE OrderDetailID = @orderDetailId AND OrderID = @orderId;
    END

    -- 2. Update/Delete active TempOrder row
    DECLARE @TempOrderID INT = (
      SELECT TOP 1 TempOrderID 
      FROM TempOrder 
      WHERE TableNumber = @tableNumber 
        AND (itemid = @itemId OR ItemName = @itemName) 
        AND OrderTime >= @orderDate
      ORDER BY TempOrderID DESC
    );

    IF @TempOrderID IS NOT NULL
    BEGIN
      IF @newQty <= 0
      BEGIN
        DELETE FROM TempOrder WHERE TempOrderID = @TempOrderID;
      END
      ELSE
      BEGIN
        UPDATE TempOrder 
        SET Qty = @newQty, Amount = @newQty * Rate 
        WHERE TempOrderID = @TempOrderID;
      END
    END

    -- 3. Recalculate Totals
    UPDATE Orders 
    SET TotalAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
    WHERE OrderID = @orderId;

    UPDATE RestaurantTables 
    SET CurrentAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
    WHERE TableID = @tableId;

    -- 4. Audit Log
    INSERT INTO KOTAuditLog (KOTNumber, TableNumber, ItemID, ItemName, DeltaQty, KOTAction, WaiterID, OutletID, LogTime, IsPrintedToKitchen, online)
    VALUES (
      @kotNumber, 
      @tableNumber, 
      @itemId, 
      @itemName, 
      @qtyDelta, 
      CASE WHEN @qtyDelta < 0 THEN 'Reduce Qty' ELSE 'Increase Qty' END, 
      @waiterId, 
      @outletId, 
      @now, 
      0, 
      1
    );
  `);
}

export async function deleteOrderItem(restaurantId: string, orderId: string, itemId: string, waiterId: string) {
  const pool = await getDb();
  const orderIdInt = parseInt(orderId, 10);
  const itemIdInt = parseInt(itemId, 10);

  const orderRes = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .query(`
      SELECT 
        o.OrderID,
        o.TableID,
        o.OrderDate,
        ISNULL(rt.TableNumber, '') as TableNumber,
        rt.OutletID
      FROM Orders o
      LEFT JOIN RestaurantTables rt ON o.TableID = rt.TableID
      WHERE o.OrderID = @orderId
    `);

  if (orderRes.recordset.length === 0) throw { status: 404, message: "Order not found" };
  const orderInfo = orderRes.recordset[0];

  const itemRes = await pool.request()
    .input("orderId", sql.Int, orderIdInt)
    .input("itemId", sql.Int, itemIdInt)
    .query(`
      SELECT TOP 1 
        od.OrderDetailID,
        od.ItemID,
        od.Quantity,
        od.Price,
        m.ItemName
      FROM OrderDetails od
      JOIN MenuItems m ON od.ItemID = m.ItemID
      WHERE od.OrderID = @orderId 
        AND (od.OrderDetailID = @itemId OR od.ItemID = @itemId)
      ORDER BY od.OrderDetailID DESC
    `);

  if (itemRes.recordset.length === 0) throw { status: 404, message: "Item not found in order" };
  const item = itemRes.recordset[0];

  const kotRes = await pool.request()
    .input("table", sql.VarChar, orderInfo.TableNumber)
    .input("orderDate", sql.DateTime, orderInfo.OrderDate)
    .query(`
      SELECT ISNULL(MAX(TRY_CAST(KOTNumber AS INT)), 0) as MaxKOT
      FROM KOTAuditLog
      WHERE TableNumber = @table AND LogTime >= @orderDate
    `);
  const maxKot = kotRes.recordset[0]?.MaxKOT || 1;
  const kotNumber = (maxKot > 0 ? maxKot : 1).toString();

  const delReq = pool.request();
  delReq.input("orderId", sql.Int, orderIdInt);
  delReq.input("orderDetailId", sql.Int, item.OrderDetailID);
  delReq.input("itemId", sql.Int, item.ItemID);
  delReq.input("itemName", sql.VarChar, item.ItemName);
  delReq.input("tableNumber", sql.VarChar, orderInfo.TableNumber);
  delReq.input("tableId", sql.Int, orderInfo.TableID);
  delReq.input("orderDate", sql.DateTime, orderInfo.OrderDate);
  delReq.input("deltaQty", sql.Int, -item.Quantity);
  delReq.input("kotNumber", sql.VarChar, kotNumber);
  delReq.input("waiterId", sql.VarChar, waiterId);
  delReq.input("outletId", sql.Int, orderInfo.OutletID);
  delReq.input("now", sql.DateTime, new Date());

  await delReq.query(`
    SET NOCOUNT ON;

    DELETE FROM OrderDetails WHERE OrderDetailID = @orderDetailId AND OrderID = @orderId;

    DELETE FROM TempOrder 
    WHERE TableNumber = @tableNumber 
      AND (itemid = @itemId OR ItemName = @itemName) 
      AND OrderTime >= @orderDate;

    UPDATE Orders 
    SET TotalAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
    WHERE OrderID = @orderId;

    UPDATE RestaurantTables 
    SET CurrentAmount = (SELECT ISNULL(SUM(Amount), 0) FROM OrderDetails WHERE OrderID = @orderId)
    WHERE TableID = @tableId;

    INSERT INTO KOTAuditLog (KOTNumber, TableNumber, ItemID, ItemName, DeltaQty, KOTAction, WaiterID, OutletID, LogTime, IsPrintedToKitchen, online)
    VALUES (@kotNumber, @tableNumber, @itemId, @itemName, @deltaQty, 'Delete Item', @waiterId, @outletId, @now, 0, 1);
  `);
}
