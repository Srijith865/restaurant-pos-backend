import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { KotTicket, KotStatus } from "../api/types";

const STATUS_CYCLE: KotStatus[] = ["pending", "preparing", "ready"];

function nextStatus(current: string): KotStatus {
  const idx = STATUS_CYCLE.indexOf(current as KotStatus);
  if (idx === -1 || idx === STATUS_CYCLE.length - 1) return STATUS_CYCLE[0];
  return STATUS_CYCLE[idx + 1];
}

function minutesSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function ticketColumn(ticket: KotTicket): "pending" | "preparing" {
  if (ticket.items.some((i) => i.kotStatus === "pending")) return "pending";
  return "preparing";
}

export default function KitchenPage() {
  const [tickets, setTickets] = useState<KotTicket[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.getKotPending();
      setTickets(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const pendingTickets = useMemo(
    () => tickets.filter((t) => ticketColumn(t) === "pending"),
    [tickets]
  );
  const prepTickets = useMemo(
    () => tickets.filter((t) => ticketColumn(t) === "preparing"),
    [tickets]
  );

  async function cycleItemStatus(orderId: string, itemId: string, current: string) {
    const status = nextStatus(current);
    try {
      await api.updateKotStatus(orderId, itemId, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function renderTicket(ticket: KotTicket, showStartPrep?: boolean) {
    const mins = minutesSince(ticket.orderTime);
    const shortId = ticket.orderId.slice(0, 8).toUpperCase();

    return (
      <article
        key={ticket.orderId}
        className="group cursor-pointer rounded border border-outline-variant bg-surface-container-lowest p-md transition-colors hover:border-primary"
      >
        <div className="mb-sm flex items-start justify-between border-b border-outline-variant pb-sm">
          <div>
            <span className="block text-h3 font-bold leading-none">#{shortId}</span>
            <span className="mt-xs block text-label-sm text-on-surface-variant">
              {ticket.tableLabel} • Dine In
            </span>
          </div>
          <span
            className={`flex items-center gap-xs text-label-md font-semibold ${
              mins >= 10 ? "text-error" : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              timer
            </span>
            {mins}m
          </span>
        </div>

        <ul className="mb-md space-y-sm">
          {ticket.items.map((item) => (
            <li key={item.id} className="flex items-start gap-sm">
              <button
                type="button"
                onClick={() => cycleItemStatus(ticket.orderId, item.id, item.kotStatus)}
                className="mt-0.5 flex-shrink-0 text-outline-variant transition-colors hover:text-secondary"
                title={`Status: ${item.kotStatus} — tap to advance`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {item.kotStatus === "preparing" ? "check_box" : "check_box_outline_blank"}
                </span>
              </button>
              <span className="mt-0.5 w-6 text-label-md font-bold">{item.quantity}x</span>
              <div className="flex-1">
                <p className="text-body-md font-medium leading-tight">{item.name}</p>
                {item.notes && (
                  <p className="mt-xs w-max rounded bg-error-container/30 px-1 py-0.5 text-label-sm text-error">
                    {item.notes.toUpperCase()}
                  </p>
                )}
                <p className="mt-xs text-label-sm capitalize text-on-surface-variant">
                  {item.kotStatus}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {showStartPrep && (
          <div className="flex justify-end border-t border-outline-variant pt-sm">
            <button
              type="button"
              onClick={() => {
                const first = ticket.items.find((i) => i.kotStatus === "pending");
                if (first) cycleItemStatus(ticket.orderId, first.id, first.kotStatus);
              }}
              className="rounded border border-outline-variant px-md py-xs text-label-sm text-primary transition-colors hover:bg-surface-container"
            >
              Start Prep
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface px-lg py-md">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined font-bold text-primary">
            local_fire_department
          </span>
          <span className="text-h3 font-bold text-primary">Kitchen Display</span>
        </div>
        <span className="text-label-md text-on-surface-variant">Auto-refresh 5s</span>
      </header>

      {error && (
        <div className="mx-container-margin mt-md rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-surface-bright p-container-margin no-scrollbar">
        <div className="flex h-full min-w-max gap-lg pb-md">
          <section className="flex h-full w-80 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-md">
              <div className="flex items-center gap-sm">
                <span className="h-2 w-2 rounded-full bg-on-surface-variant" />
                <h2 className="text-label-md font-semibold text-primary">Pending</h2>
              </div>
              <span className="rounded bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">
                {pendingTickets.length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-md overflow-y-auto bg-surface-container-lowest p-md no-scrollbar">
              {pendingTickets.length === 0 ? (
                <p className="text-label-md text-on-surface-variant">No pending tickets</p>
              ) : (
                pendingTickets.map((t) => renderTicket(t, true))
              )}
            </div>
          </section>

          <section className="flex h-full w-80 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-high p-md">
              <div className="flex items-center gap-sm">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                <h2 className="text-label-md font-semibold text-primary">In Prep</h2>
              </div>
              <span className="rounded bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">
                {prepTickets.length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-md overflow-y-auto bg-surface-container-lowest p-md no-scrollbar">
              {prepTickets.length === 0 ? (
                <p className="text-label-md text-on-surface-variant">No tickets in prep</p>
              ) : (
                prepTickets.map((t) => renderTicket(t))
              )}
            </div>
          </section>

          <section className="flex h-full w-80 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest opacity-80">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-low p-md">
              <div className="flex items-center gap-sm">
                <span className="h-2 w-2 rounded-full bg-primary-fixed-dim" />
                <h2 className="text-label-md font-semibold text-primary">Ready for Expo</h2>
              </div>
              <span className="rounded bg-surface-container px-2 py-1 text-label-sm text-on-surface-variant">
                0
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-md overflow-y-auto p-md no-scrollbar">
              <p className="text-label-md text-on-surface-variant">
                Ready items leave this queue automatically
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
