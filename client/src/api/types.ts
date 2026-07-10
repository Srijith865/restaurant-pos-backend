export interface LoginResponse {
  token: string;
  restaurantId: string;
  staffId: string;
}

export type StaffRole = "admin" | "waiter" | "kitchen";

export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  restaurantId: string;
}

export interface MeResponse {
  id: string;
  name: string;
  role: string;
  restaurantId: string;
  restaurantName: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  price: string | number;
  isAvailable: boolean;
}

export interface DiningTable {
  id: string;
  restaurantId: string;
  label: string;
  isOccupied: boolean;
}

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  priceEach: string | number;
  kotStatus: "pending" | "preparing" | "ready" | "served";
  notes: string | null;
  menuItem: { name: string };
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  staffId: string;
  status: "open" | "billed" | "paid" | "cancelled";
  total: string | number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  table: { id: string; label: string };
}

export interface KotTicket {
  orderId: string;
  tableId: string;
  tableLabel: string;
  orderTime: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    notes: string | null;
    kotStatus: string;
  }[];
}

export type KotStatus = "pending" | "preparing" | "ready" | "served";
