import { useEffect, useState, useMemo } from "react";
import { api, formatPrice } from "../api/client";
import type { Order } from "../api/types";

function lineTotal(price: string | number, qty: number): number {
  const p = typeof price === "string" ? parseFloat(price) : price;
  return p * qty;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      try {
        const data = await api.getOrders();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const runningOrders = useMemo(
    () => orders.filter((o) => o.status === "open" || o.status === "billed"),
    [orders]
  );
  
  const pastOrders = useMemo(
    () => orders.filter((o) => o.status === "paid" || o.status === "cancelled"),
    [orders]
  );

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-on-surface-variant">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="hidden w-full items-center justify-between border-b border-outline-variant px-xl py-lg md:flex">
        <div>
          <h1 className="text-h2 text-primary">Dashboard</h1>
          <p className="mt-xs text-body-md text-on-surface-variant">
            Overview of running and past orders
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-xl overflow-y-auto p-md md:flex-row md:p-xl">
        <div className="flex min-w-0 flex-1 flex-col gap-xl">
          {error && (
            <p className="rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
              {error}
            </p>
          )}

          <section>
            <h2 className="mb-md text-h3 text-primary">Running Orders</h2>
            {runningOrders.length === 0 ? (
              <p className="text-on-surface-variant">No running orders</p>
            ) : (
              <div className="flex flex-col gap-sm">
                {runningOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`flex items-center justify-between rounded border p-md text-left transition-colors ${
                      selectedOrderId === o.id
                        ? "border-primary bg-surface-container"
                        : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
                    }`}
                  >
                    <div>
                      <span className="text-label-md font-medium text-primary">
                        {o.table.label}
                      </span>
                      <span className="ml-sm text-label-sm text-on-surface-variant">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-body-md text-primary">
                        {formatPrice(o.total)}
                      </span>
                      <span className="text-label-sm capitalize text-on-surface-variant">
                        {o.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-md text-h3 text-primary">Past Orders</h2>
            {pastOrders.length === 0 ? (
              <p className="text-on-surface-variant">No past orders</p>
            ) : (
              <div className="flex flex-col gap-sm">
                {pastOrders.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`flex items-center justify-between rounded border p-md text-left transition-colors ${
                      selectedOrderId === o.id
                        ? "border-primary bg-surface-container"
                        : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low"
                    }`}
                  >
                    <div>
                      <span className="text-label-md font-medium text-primary">
                        {o.table.label}
                      </span>
                      <span className="ml-sm text-label-sm text-on-surface-variant">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-body-md text-primary">
                        {formatPrice(o.total)}
                      </span>
                      <span className="text-label-sm capitalize text-on-surface-variant">
                        {o.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex w-full flex-col gap-lg md:w-[400px]">
          {selectedOrder ? (
            <>
              <h2 className="mb-md text-h3 text-primary">
                Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
              </h2>
              <div className="flex flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
                <div className="grid grid-cols-[3fr_1fr_1fr] gap-sm border-b border-outline-variant bg-surface-container-low p-md text-label-sm uppercase text-on-surface-variant">
                  <div>Item</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Price</div>
                </div>

                <div className="flex flex-1 flex-col gap-sm overflow-y-auto p-md">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[3fr_1fr_1fr] items-start gap-sm border-b border-surface-container py-sm last:border-b-0"
                    >
                      <div>
                        <div className="text-body-md font-medium text-primary">
                          {item.menuItem.name}
                        </div>
                        {item.notes && (
                          <div className="mt-xs text-label-sm text-on-surface-variant">
                            {item.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-center text-body-md text-on-surface-variant">
                        {item.quantity}
                      </div>
                      <div className="text-right text-body-md text-primary">
                        {formatPrice(lineTotal(item.priceEach, item.quantity))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex items-baseline justify-between">
                    <span className="text-h3 text-primary">Total Bill</span>
                    <span className="text-h1 text-primary">{formatPrice(selectedOrder.total)}</span>
                  </div>
                  <div className="mt-sm flex justify-between text-label-md text-on-surface-variant">
                    <span>Status</span>
                    <span className="capitalize text-primary">{selectedOrder.status}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center text-on-surface-variant">
              Select an order to view the bill details
            </div>
          )}
        </div>
      </div>
    </>
  );
}
