import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import type { DiningTable, MenuCategory, MenuItem, MeResponse } from "../api/types";

interface CartLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function PosPage() {
  const location = useLocation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unauthorizedMsg, setUnauthorizedMsg] = useState<string | null>(
    () => (location.state as { unauthorized?: string } | null)?.unauthorized ?? null
  );

  useEffect(() => {
    const msg = (location.state as { unauthorized?: string } | null)?.unauthorized;
    if (msg) {
      setUnauthorizedMsg(msg);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    async function load() {
      try {
        const [profile, cats, menuItems, tableList] = await Promise.all([
          api.getMe(),
          api.getCategories(),
          api.getItems(),
          api.getTables(),
        ]);
        setMe(profile);
        setCategories(cats);
        setItems(menuItems.filter((i) => i.isAvailable));
        setTables(tableList);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return items;
    return items.filter((i) => i.categoryId === selectedCategoryId);
  }, [items, selectedCategoryId]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  function addToCart(item: MenuItem) {
    const price = typeof item.price === "string" ? parseFloat(item.price) : item.price;
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { menuItemId: item.id, name: item.name, price, quantity: 1 }];
    });
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + delta } : l
        )
        .filter((l) => l.quantity > 0)
    );
  }

  async function sendToKitchen() {
    if (!selectedTableId) {
      setError("Select a table first");
      return;
    }
    if (cart.length === 0) {
      setError("Add items to the order first");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.createOrder(
        selectedTableId,
        cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity }))
      );
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send order");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }

  return (
    <>
      <header className="z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-lg py-md">
        <h1 className="hidden text-h3 font-bold tracking-tight text-primary md:block">
          {me?.restaurantName ?? "POS"}
        </h1>
        <div className="flex items-center gap-sm">
          <span className="text-label-md text-on-surface-variant">{me?.name}</span>
        </div>
      </header>

      {!selectedTableId && (
        <div className="border-b border-outline-variant bg-surface-container-low px-xl py-md">
          <p className="mb-sm text-label-md text-on-surface-variant">Select a table</p>
          <div className="flex flex-wrap gap-sm">
            {tables.map((table) => (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedTableId(table.id)}
                className={`rounded border px-md py-sm text-label-md transition-colors ${
                  table.isOccupied
                    ? "border-secondary bg-secondary-fixed/30 text-primary"
                    : "border-outline-variant bg-surface hover:bg-surface-container"
                }`}
              >
                {table.label}
                {table.isOccupied && " • Occupied"}
              </button>
            ))}
          </div>
        </div>
      )}

      {unauthorizedMsg && (
        <div className="mx-xl mt-md rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
          {unauthorizedMsg}
        </div>
      )}

      {error && (
        <div className="mx-xl mt-md rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
          {error}
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden bg-surface lg:flex-row">
        <section className="flex h-full flex-[6] flex-col border-r border-outline-variant">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-bright px-xl py-md">
            <div className="no-scrollbar flex gap-sm overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`whitespace-nowrap rounded px-md py-sm text-label-md ${
                  selectedCategoryId === null
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container"
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`whitespace-nowrap rounded px-md py-sm text-label-md transition-colors ${
                    selectedCategoryId === cat.id
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-surface-bright p-xl">
            {filteredItems.length === 0 ? (
              <p className="text-on-surface-variant">No items available</p>
            ) : (
              <div className="grid grid-cols-2 gap-md md:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    className="group flex h-32 flex-col justify-between rounded border border-outline-variant bg-surface-container-lowest p-md text-left transition-colors hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <div>
                      <h3 className="truncate text-label-md text-primary">{item.name}</h3>
                      <p className="mt-xs text-body-md text-on-surface-variant">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <div className="self-end text-outline-variant transition-colors group-hover:text-primary">
                      <span className="material-symbols-outlined">add</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="relative z-10 flex h-full flex-[4] flex-col bg-surface-container-lowest">
          <div className="border-b border-outline-variant bg-surface-container-lowest px-xl py-lg">
            <div className="mb-sm flex items-center justify-between">
              <h2 className="text-h3 text-primary">Current Order</h2>
              {selectedTable ? (
                <span className="rounded bg-surface-container px-sm py-xs text-label-sm uppercase tracking-widest text-on-surface-variant">
                  {selectedTable.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedTableId(null)}
                  className="text-label-md text-secondary"
                >
                  Pick table
                </button>
              )}
            </div>
            {selectedTable && (
              <button
                type="button"
                onClick={() => setSelectedTableId(null)}
                className="text-label-sm text-on-surface-variant hover:text-primary"
              >
                Change table
              </button>
            )}
            <p className="text-body-md text-on-surface-variant">
              Server: {me?.name ?? "—"}
            </p>
          </div>

          <div className="flex flex-1 flex-col gap-md overflow-y-auto px-xl py-md">
            {cart.length === 0 ? (
              <p className="text-on-surface-variant">No items yet</p>
            ) : (
              cart.map((line) => (
                <div
                  key={line.menuItemId}
                  className="group flex items-start justify-between border-b border-surface-variant py-sm last:border-0"
                >
                  <div className="flex-1 pr-md">
                    <h4 className="text-label-md text-primary">{line.name}</h4>
                    <p className="mt-sm text-label-sm text-primary">
                      {formatPrice(line.price * line.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-sm rounded border border-outline-variant bg-surface-container-low p-xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.menuItemId, -1)}
                      className="flex h-6 w-6 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        remove
                      </span>
                    </button>
                    <span className="w-4 text-center text-label-md text-primary">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.menuItemId, 1)}
                      className="flex h-6 w-6 items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        add
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-auto border-t border-outline-variant bg-surface-container-lowest p-xl">
            <div className="mb-lg space-y-sm">
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="mt-sm flex justify-between border-t border-surface-variant pt-sm text-h2 text-primary">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={sendToKitchen}
              disabled={submitting || cart.length === 0}
              className="flex w-full items-center justify-center gap-sm bg-primary py-md text-label-md text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                send
              </span>
              {submitting ? "Sending…" : "Send to Kitchen"}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
