import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import type { Order } from "../api/types";

function lineTotal(price: string | number, qty: number): number {
  const p = typeof price === "string" ? parseFloat(price) : price;
  return p * qty;
}

export default function BillingPage() {
  const { orderId: routeOrderId } = useParams();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedId = routeOrderId ?? order?.id ?? null;

  useEffect(() => {
    async function loadOrders() {
      try {
        const [open, billed] = await Promise.all([
          api.getOrders("open"),
          api.getOrders("billed"),
        ]);
        setOrders([...billed, ...open]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  useEffect(() => {
    if (!routeOrderId) {
      setOrder(null);
      return;
    }

    const orderId = routeOrderId;

    async function loadOrder() {
      try {
        const data = await api.getOrder(orderId);
        setOrder(data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order");
      }
    }
    loadOrder();
  }, [routeOrderId]);

  async function handleMarkPaid() {
    if (!order) return;

    setPaying(true);
    setError("");
    setSuccess("");

    try {
      let current = order;
      if (current.status === "open") {
        current = await api.billOrder(current.id);
      }
      if (current.status === "billed") {
        current = await api.payOrder(current.id);
      }
      setOrder(current);
      setSuccess("Payment recorded");
      setOrders((prev) => prev.filter((o) => o.id !== current.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
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
      <div className="hidden w-full items-center justify-between border-b border-outline-variant px-xl py-lg md:flex">
        <div>
          <h1 className="text-h2 text-primary">
            {order ? `${order.table.label} — Billing` : "Billing"}
          </h1>
          {order && (
            <p className="mt-xs text-body-md text-on-surface-variant">
              Order #{order.id.slice(0, 8).toUpperCase()} • {order.status}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-xl overflow-y-auto p-md md:flex-row md:p-xl">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-md flex items-end justify-between">
            <h2 className="text-h3 text-primary">Open Orders</h2>
          </div>

          {orders.length === 0 ? (
            <p className="text-on-surface-variant">No open or billed orders</p>
          ) : (
            <div className="mb-lg flex flex-col gap-sm">
              {orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => navigate(`/billing/${o.id}`)}
                  className={`flex items-center justify-between rounded border p-md text-left transition-colors ${
                    selectedId === o.id
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

          {order && (
            <>
              <h2 className="mb-md text-h3 text-primary">Order Summary</h2>
              <div className="flex flex-1 flex-col overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
                <div className="grid grid-cols-[3fr_1fr_1fr] gap-sm border-b border-outline-variant bg-surface-container-low p-md text-label-sm uppercase text-on-surface-variant">
                  <div>Item</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Price</div>
                </div>

                <div className="flex flex-1 flex-col gap-sm overflow-y-auto p-md">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="group grid grid-cols-[3fr_1fr_1fr] items-start gap-sm border-b border-surface-container py-sm"
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
                    <span className="text-h3 text-primary">Total</span>
                    <span className="text-h1 text-primary">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex w-full flex-col gap-lg md:w-[350px]">
          {error && (
            <p className="rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded bg-secondary-fixed px-md py-sm text-label-md text-on-secondary-fixed">
              {success}
            </p>
          )}

          {order && order.status !== "paid" && order.status !== "cancelled" && (
            <div className="mt-auto pt-lg">
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={paying}
                className="flex w-full items-center justify-center gap-sm bg-primary py-lg text-h3 text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined">check_circle</span>
                {paying ? "Processing…" : "Mark as Paid"}
              </button>
              {order.status === "open" && (
                <p className="mt-sm text-center text-label-sm text-on-surface-variant">
                  Will generate bill automatically before payment
                </p>
              )}
            </div>
          )}

          {order?.status === "paid" && (
            <div className="rounded border border-outline-variant bg-surface-container-low p-md text-center">
              <span className="material-symbols-outlined text-primary">done_all</span>
              <p className="mt-sm text-label-md text-primary">This order has been paid</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
