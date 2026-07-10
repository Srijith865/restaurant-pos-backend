import { getToken, clearToken } from "./auth";
import type {
  DiningTable,
  KotTicket,
  LoginResponse,
  MeResponse,
  MenuCategory,
  MenuItem,
  Order,
  OrderItemInput,
  KotStatus,
  Staff,
  Outlet,
  MenuItemPrice,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_URL || "https://restaurant-pos-backend-kzmq.onrender.com";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new ApiError(401, "Unauthorized");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Request failed");
  }

  return data as T;
}

export const api = {
  getWaiters() {
    return request<{ WaiterID: number; WaiterName: string }[]>("/auth/waiters");
  },

  login(waiterId: number) {
    return request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ waiterId }),
    });
  },

  getMe() {
    return request<MeResponse>("/me");
  },

  getCategories() {
    return request<MenuCategory[]>("/categories");
  },

  createCategory(name: string, sortOrder?: number) {
    return request<MenuCategory>("/categories", {
      method: "POST",
      body: JSON.stringify({ name, sortOrder }),
    });
  },

  updateCategory(id: string, data: { name?: string; sortOrder?: number }) {
    return request<MenuCategory>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteCategory(id: string) {
    return request<void>(`/categories/${id}`, { method: "DELETE" });
  },

  getItems(categoryId?: string) {
    const qs = categoryId ? `?categoryId=${categoryId}` : "";
    return request<MenuItem[]>(`/items${qs}`);
  },

  createItem(data: {
    categoryId: string;
    name: string;
    price: number;
    isAvailable?: boolean;
  }) {
    return request<MenuItem>("/items", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateItem(
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      price?: number;
      isAvailable?: boolean;
    }
  ) {
    return request<MenuItem>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  toggleItem(id: string) {
    return request<MenuItem>(`/items/${id}/toggle`, { method: "PATCH" });
  },

  updateItemPrices(id: string, prices: MenuItemPrice[]) {
    return request<{ success: boolean }>(`/items/${id}/prices`, {
      method: "PATCH",
      body: JSON.stringify({ prices }),
    });
  },

  deleteItem(id: string) {
    return request<void>(`/items/${id}`, { method: "DELETE" });
  },

  getTables() {
    return request<DiningTable[]>("/tables");
  },

  createTable(label: string, outletId?: string) {
    return request<DiningTable>("/tables", {
      method: "POST",
      body: JSON.stringify({ label, outletId }),
    });
  },

  updateTable(id: string, data: { label?: string; isOccupied?: boolean; outletId?: string }) {
    return request<DiningTable>(`/tables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteTable(id: string) {
    return request<void>(`/tables/${id}`, { method: "DELETE" });
  },

  createOrder(tableId: string, items: OrderItemInput[]) {
    return request<Order>("/orders", {
      method: "POST",
      body: JSON.stringify({ tableId, items }),
    });
  },

  getOrders(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return request<Order[]>(`/orders${qs}`);
  },

  getOrder(id: string) {
    return request<Order>(`/orders/${id}`);
  },

  billOrder(id: string) {
    return request<Order>(`/orders/${id}/bill`, { method: "POST" });
  },

  payOrder(id: string) {
    return request<Order>(`/orders/${id}/pay`, { method: "POST" });
  },

  getKotPending() {
    return request<KotTicket[]>("/kot/pending");
  },

  updateKotStatus(orderId: string, itemId: string, status: KotStatus) {
    return request(`/orders/${orderId}/items/${itemId}/kot-status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  getStaff() {
    return request<Staff[]>("/staff");
  },

  createStaff(data: { name: string; phone: string; password: string; role: string }) {
    return request<Staff>("/staff", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deleteStaff(id: string) {
    return request<void>(`/staff/${id}`, { method: "DELETE" });
  },

  getOutlets() {
    return request<Outlet[]>("/outlets");
  },

  createOutlet(name: string) {
    return request<Outlet>("/outlets", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  deleteOutlet(id: string) {
    return request<void>(`/outlets/${id}`, { method: "DELETE" });
  },
};

export function formatPrice(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `Rs ${num.toFixed(2)}`;
}

export { ApiError };
