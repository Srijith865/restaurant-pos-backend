import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import type { DiningTable, MenuCategory, MenuItem, Staff } from "../api/types";

type AdminTab = "categories" | "items" | "tables" | "staff";

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-md rounded bg-error-container px-md py-sm text-label-md text-on-error-container">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 hover:opacity-70">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            close
          </span>
        </button>
      )}
    </div>
  );
}

function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded border border-outline-variant bg-surface-container-lowest">
      <div
        className="grid gap-sm border-b border-outline-variant bg-surface-container-low p-md text-label-sm uppercase text-on-surface-variant"
        style={{ gridTemplateColumns: `repeat(${headers.length}, minmax(0, 1fr))` }}
      >
        {headers.map((h) => (
          <div key={h}>{h}</div>
        ))}
      </div>
      <div className="divide-y divide-surface-container">{children}</div>
    </div>
  );
}

function AdminRow({
  cols,
  children,
}: {
  cols: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid items-center gap-sm p-md text-body-md"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

function FormPanel({
  title,
  onClose,
  onSubmit,
  children,
  submitLabel,
  loading,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  children: React.ReactNode;
  submitLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="mb-lg rounded border border-outline-variant bg-surface-container-low p-md">
      <div className="mb-md flex items-center justify-between">
        <h3 className="text-label-md font-semibold text-primary">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-on-surface-variant hover:text-primary"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            close
          </span>
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-md">
        {children}
        <button
          type="submit"
          disabled={loading}
          className="self-start bg-primary px-lg py-sm text-label-md text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : submitLabel}
        </button>
      </form>
    </div>
  );
}

function fieldClassName() {
  return "w-full border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-primary focus:border-secondary focus:outline-none";
}

// ── Categories tab ──────────────────────────────────────────────────

function CategoriesTab({
  onError,
}: {
  onError: (msg: string) => void;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCategories(await api.getCategories());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setName("");
    setSortOrder("0");
    setShowAdd(false);
    setEditingId(null);
  }

  function startEdit(cat: MenuCategory) {
    setEditingId(cat.id);
    setName(cat.name);
    setSortOrder(String(cat.sortOrder));
    setShowAdd(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");

    try {
      const order = parseInt(sortOrder, 10);
      if (editingId) {
        await api.updateCategory(editingId, {
          name,
          sortOrder: Number.isNaN(order) ? 0 : order,
        });
      } else {
        await api.createCategory(name, Number.isNaN(order) ? 0 : order);
      }
      resetForm();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    onError("");

    try {
      await api.deleteCategory(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="text-on-surface-variant">Loading categories…</p>;

  return (
    <div>
      {!showAdd && !editingId && (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="mb-lg flex items-center gap-sm bg-primary px-md py-sm text-label-md text-on-primary hover:opacity-90"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Add Category
        </button>
      )}

      {(showAdd || editingId) && (
        <FormPanel
          title={editingId ? "Edit Category" : "Add Category"}
          onClose={resetForm}
          onSubmit={handleSubmit}
          submitLabel={editingId ? "Save Changes" : "Create Category"}
          loading={saving}
        >
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Name</label>
            <input
              className={fieldClassName()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">
              Sort Order
            </label>
            <input
              type="number"
              className={fieldClassName()}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
        </FormPanel>
      )}

      {categories.length === 0 ? (
        <p className="text-on-surface-variant">No categories yet.</p>
      ) : (
        <AdminTable headers={["Name", "Sort Order", "Actions"]}>
          {categories.map((cat) => (
            <AdminRow key={cat.id} cols={3}>
              <div className="font-medium text-primary">{cat.name}</div>
              <div className="text-on-surface-variant">{cat.sortOrder}</div>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={() => startEdit(cat)}
                  className="rounded border border-outline-variant px-sm py-xs text-label-sm text-primary hover:bg-surface-container"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat.id)}
                  className="rounded border border-outline-variant px-sm py-xs text-label-sm text-error hover:bg-error-container/30"
                >
                  Delete
                </button>
              </div>
            </AdminRow>
          ))}
        </AdminTable>
      )}
    </div>
  );
}

// ── Menu Items tab ──────────────────────────────────────────────────

function ItemsTab({ onError }: { onError: (msg: string) => void }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [itemList, catList] = await Promise.all([api.getItems(), api.getCategories()]);
      setItems(itemList);
      setCategories(catList);
      setCategoryId((prev) => prev || catList[0]?.id || "");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setName("");
    setPrice("");
    setCategoryId(categories[0]?.id ?? "");
    setShowAdd(false);
    setEditingId(null);
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setCategoryId(item.categoryId);
    setShowAdd(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");

    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      onError("Price must be a positive number");
      setSaving(false);
      return;
    }

    try {
      if (editingId) {
        await api.updateItem(editingId, { name, price: priceNum, categoryId });
      } else {
        await api.createItem({ name, price: priceNum, categoryId });
      }
      resetForm();
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    setTogglingId(id);
    onError("");

    try {
      const updated = await api.toggleItem(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <p className="text-on-surface-variant">Loading menu items…</p>;

  return (
    <div>
      {!showAdd && !editingId && (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          disabled={categories.length === 0}
          className="mb-lg flex items-center gap-sm bg-primary px-md py-sm text-label-md text-on-primary hover:opacity-90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Add Item
        </button>
      )}

      {categories.length === 0 && (
        <p className="mb-md text-on-surface-variant">Create a category first.</p>
      )}

      {(showAdd || editingId) && (
        <FormPanel
          title={editingId ? "Edit Item" : "Add Item"}
          onClose={resetForm}
          onSubmit={handleSubmit}
          submitLabel={editingId ? "Save Changes" : "Create Item"}
          loading={saving}
        >
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Name</label>
            <input
              className={fieldClassName()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Price</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={fieldClassName()}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Category</label>
            <select
              className={fieldClassName()}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </FormPanel>
      )}

      {items.length === 0 ? (
        <p className="text-on-surface-variant">No menu items yet.</p>
      ) : (
        <AdminTable headers={["Name", "Category", "Price", "Available", "Actions"]}>
          {items.map((item) => (
            <AdminRow key={item.id} cols={5}>
              <div className="font-medium text-primary">{item.name}</div>
              <div className="text-on-surface-variant">{item.categoryName}</div>
              <div>{formatPrice(item.price)}</div>
              <div>
                <button
                  type="button"
                  disabled={togglingId === item.id}
                  onClick={() => handleToggle(item.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    item.isAvailable ? "bg-secondary" : "bg-outline-variant"
                  } disabled:opacity-50`}
                  aria-label="Toggle availability"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      item.isAvailable ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded border border-outline-variant px-sm py-xs text-label-sm text-primary hover:bg-surface-container"
                >
                  Edit
                </button>
              </div>
            </AdminRow>
          ))}
        </AdminTable>
      )}
    </div>
  );
}

// ── Tables tab ──────────────────────────────────────────────────────

function TablesTab({ onError }: { onError: (msg: string) => void }) {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setTables(await api.getTables());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");

    try {
      await api.createTable(label);
      setLabel("");
      setShowAdd(false);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this table?")) return;
    onError("");

    try {
      await api.deleteTable(id);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="text-on-surface-variant">Loading tables…</p>;

  return (
    <div>
      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="mb-lg flex items-center gap-sm bg-primary px-md py-sm text-label-md text-on-primary hover:opacity-90"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Add Table
        </button>
      )}

      {showAdd && (
        <FormPanel
          title="Add Table"
          onClose={() => {
            setShowAdd(false);
            setLabel("");
          }}
          onSubmit={handleSubmit}
          submitLabel="Create Table"
          loading={saving}
        >
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Label</label>
            <input
              className={fieldClassName()}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="T1"
              required
            />
          </div>
        </FormPanel>
      )}

      {tables.length === 0 ? (
        <p className="text-on-surface-variant">No tables yet.</p>
      ) : (
        <AdminTable headers={["Label", "Status", "Actions"]}>
          {tables.map((table) => (
            <AdminRow key={table.id} cols={3}>
              <div className="font-medium text-primary">{table.label}</div>
              <div>
                <span
                  className={`rounded px-sm py-xs text-label-sm ${
                    table.isOccupied
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {table.isOccupied ? "Occupied" : "Available"}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleDelete(table.id)}
                  className="rounded border border-outline-variant px-sm py-xs text-label-sm text-error hover:bg-error-container/30"
                >
                  Delete
                </button>
              </div>
            </AdminRow>
          ))}
        </AdminTable>
      )}
    </div>
  );
}

// ── Staff tab ───────────────────────────────────────────────────────

function StaffTab({ onError }: { onError: (msg: string) => void }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("waiter");
  
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setStaff(await api.getStaff());
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError("");

    try {
      await api.createStaff({ name, phone, password, role });
      setName("");
      setPhone("");
      setPassword("");
      setRole("waiter");
      setShowAdd(false);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this staff member?")) return;
    onError("");

    try {
      await api.deleteStaff(id);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="text-on-surface-variant">Loading staff…</p>;

  return (
    <div>
      {!showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="mb-lg flex items-center gap-sm bg-primary px-md py-sm text-label-md text-on-primary hover:opacity-90"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            add
          </span>
          Add Staff
        </button>
      )}

      {showAdd && (
        <FormPanel
          title="Add Staff"
          onClose={() => {
            setShowAdd(false);
            setName("");
            setPhone("");
            setPassword("");
            setRole("waiter");
          }}
          onSubmit={handleSubmit}
          submitLabel="Create Staff"
          loading={saving}
        >
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Name</label>
            <input
              className={fieldClassName()}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Phone (Login ID)</label>
            <input
              className={fieldClassName()}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Password</label>
            <input
              type="password"
              className={fieldClassName()}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="text-label-sm uppercase text-on-surface-variant">Role</label>
            <select
              className={fieldClassName()}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="waiter">Waiter (POS App)</option>
              <option value="kitchen">Kitchen (KOT Display)</option>
              <option value="admin">Admin (Dashboard)</option>
            </select>
          </div>
        </FormPanel>
      )}

      {staff.length === 0 ? (
        <p className="text-on-surface-variant">No staff yet.</p>
      ) : (
        <AdminTable headers={["Name", "Phone", "Role", "Status", "Actions"]}>
          {staff.map((s) => (
            <AdminRow key={s.id} cols={5}>
              <div className="font-medium text-primary">{s.name}</div>
              <div className="text-on-surface-variant">{s.phone}</div>
              <div className="uppercase text-on-surface-variant text-label-sm">{s.role}</div>
              <div>
                <span
                  className={`rounded px-sm py-xs text-label-sm ${
                    s.isActive
                      ? "bg-secondary-fixed text-on-secondary-fixed"
                      : "bg-error-container text-on-error-container"
                  }`}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  className="rounded border border-outline-variant px-sm py-xs text-label-sm text-error hover:bg-error-container/30"
                >
                  Delete
                </button>
              </div>
            </AdminRow>
          ))}
        </AdminTable>
      )}
    </div>
  );
}

// ── Main admin page ─────────────────────────────────────────────────

const TABS: { key: AdminTab; label: string }[] = [
  { key: "categories", label: "Categories" },
  { key: "items", label: "Menu Items" },
  { key: "tables", label: "Tables" },
  { key: "staff", label: "Staff" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("categories");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getMe()
      .then((me) => {
        if (me.role !== "admin") {
          navigate("/pos", {
            replace: true,
            state: { unauthorized: "Not authorized — admin access only." },
          });
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center text-on-surface-variant">
        Checking access…
      </div>
    );
  }

  return (
    <>
      <header className="border-b border-outline-variant bg-surface px-xl py-lg">
        <h1 className="text-h2 text-primary">Admin</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          Manage categories, menu items, and tables
        </p>
      </header>

      <div className="border-b border-outline-variant bg-surface-bright px-xl py-md">
        <div className="flex gap-sm">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setError("");
              }}
              className={`rounded px-md py-sm text-label-md transition-colors ${
                tab === key
                  ? "bg-primary text-on-primary"
                  : "border border-outline-variant bg-surface text-on-surface hover:bg-surface-container"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-xl">
        {error && (
          <div className="mb-lg">
            <ErrorBanner message={error} onDismiss={() => setError("")} />
          </div>
        )}

        {tab === "categories" && <CategoriesTab onError={setError} />}
        {tab === "items" && <ItemsTab onError={setError} />}
        {tab === "tables" && <TablesTab onError={setError} />}
        {tab === "staff" && <StaffTab onError={setError} />}
      </div>
    </>
  );
}
