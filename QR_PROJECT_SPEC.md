# QR Code Restaurant Ordering System - Master Project Specification

## 1. Project Overview & Business Goal
This project is an independent, mobile-first Web Ordering application for restaurants. Customers scan a table QR code on their smartphones, browse the menu, customize items, and place orders directly to the kitchen without needing a waiter, staff login, or native mobile app installation.

### Key Integration Requirement:
The customer web app sends orders to a Microsoft SQL Server database. The restaurant's existing .NET Desktop POS software (created by the user's father) monitors the database, reads from `TempOrder`, prints Kitchen Order Tickets (KOT) on kitchen thermal printers, and manages cashier billing and table settlement.

---

## 2. Database Contract & Schema Synchronization
The database is Microsoft SQL Server (`bteapcet_RestaurantDB`). The system must maintain strict synchronization across the following tables:

1. **`TempOrder` (Primary table for father's desktop software):**
   - Columns: `TempOrderID` (PK, INT IDENTITY), `TableNumber` (VARCHAR), `WaiterID` (VARCHAR, can be `'QR'` or `'Customer'`), `ItemName` (VARCHAR), `Qty` (INT), `Rate` (DECIMAL), `Amount` (DECIMAL), `OrderTime` (DATETIME), `IsKOTPrinted` (BIT), `itemid` (INT), `narration` (TEXT).
   - When an order is placed by a customer, rows are inserted with `IsKOTPrinted = 0`.
   - The father's .NET software picks up unprinted rows (`IsKOTPrinted = 0`), prints the physical KOT ticket in the kitchen, and updates `IsKOTPrinted = 1`.
   - If an order is cancelled during the grace period, matching active rows are deleted from `TempOrder`.

2. **`Orders` (Active Bill Header):**
   - Columns: `OrderID` (INT), `TableID` (INT), `StewardID` (VARCHAR), `OrderDate` (DATETIME), `TotalAmount` (DECIMAL), `IsKOTRaised` (BIT), `IsPaid` (BIT).
   - Manages active open orders (`IsPaid = 0`).

3. **`OrderDetails` (Bill Line Items):**
   - Columns: `OrderDetailID` (INT), `OrderID` (INT), `ItemID` (INT), `Quantity` (INT), `Price` (DECIMAL), `Amount` (DECIMAL).
   - In lockstep with `TempOrder`.

4. **`RestaurantTables` (Table Grid & Floor State):**
   - Columns: `TableID`, `TableNumber`, `OutletID`, `Status` ('Available' / 'Occupied'), `CurrentAmount`, `OccupiedSince`.

5. **`KOTAuditLog` (Action & Ticket Audit Trail):**
   - Columns: `LogID` (INT IDENTITY), `KOTNumber` (VARCHAR), `TableNumber` (VARCHAR), `ItemID` (INT), `ItemName` (VARCHAR), `DeltaQty` (INT), `KOTAction` (VARCHAR), `WaiterID` (VARCHAR), `OutletID` (INT), `LogTime` (DATETIME), `IsPrintedToKitchen` (BIT), `online` (INT).
   - Tracks sequential KOT numbers per table session:
     - 1st batch ordered = KOT #1 (`KOTAction: 'New Order'`)
     - 2nd batch ordered later = KOT #2 (`KOTAction: 'Add Items'`)
     - Cancelled order = KOT #1 (`KOTAction: 'Cancel Order'`, negative delta)
     - When table is paid and cleared, next customer starts back at KOT #1.

---

## 3. Customer User Experience & Flow
1. **QR Scan & Auto-Detection:**
   - QR URL format: `https://<domain>/order/:tableNumber` (e.g. `/order/5` or `?table=5`).
   - The web app reads the table number from the URL and locks it in. No login or PIN required.
2. **Interactive Mobile Menu:**
   - Category navigation tabs (Starters, Mains, Biryanis, Breads, Drinks, Desserts).
   - Dietary badges (Veg 🟢, Non-Veg 🔴, Spicy 🌶️).
   - Item search and category filter.
   - Special instruction notes per item (*"Extra spicy"*, *"No onions"*).
3. **Floating Bottom Cart:**
   - Displays item count and subtotal. Tapping opens the slide-up cart review sheet.
4. **Order Confirmation Sheet:**
   - Prompts the customer to review items, quantities, special requests, and table number before submitting.
   - Single prominent button: **"Confirm & Send to Kitchen"**.
5. **Accidental Order Protection (Grace Period):**
   - Once submitted, a **45–60 second countdown banner** appears: *"Order sent to kitchen! Cancel or edit [58s]"*.
   - During this window, the customer can tap "Undo / Cancel Order" if they ordered by mistake.
   - When cancelled, backend deletes from `TempOrder`, `OrderDetails`, `Orders`, and logs audit.
   - After the timer expires, the order is locked as cooking.
6. **Running Orders (KOT 2, KOT 3):**
   - If customers order more food later, the web app appends items to the active order as KOT #2 without overriding earlier items.

---

## 4. Architecture & Reused Modules
- **Backend (`src/`):**
  - Node.js + Express + TypeScript.
  - Connection pool with auto-reconnect (`src/lib/db.ts`).
  - Public customer endpoints:
    - `GET /api/qr/menu` — public menu categories & items (no auth required).
    - `GET /api/qr/table/:tableNumber/active` — active table order details if any.
    - `POST /api/qr/table/:tableNumber/order` — place new order / add items to existing table.
    - `POST /api/qr/order/:orderId/cancel` — cancel within grace period.
- **Frontend (`client/`):**
  - Vite + React + TypeScript + Tailwind CSS.
  - Mobile-first responsive UI.
