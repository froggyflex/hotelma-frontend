import { useEffect, useState } from "react";
import {
  fetchActiveProducts,
  fetchActiveTables,
  fetchActiveNotes,
  fetchOrdersByTable,
} from "../services/kitchenOrdersApi";

import OrderSheet from "../components/OrderSheet";
import ModifierModal from "../components/ModifierModal";
import {
  updateOrderPrintStatus,
} from "../services/kitchenOrdersApi";
import { buildThermalPrint } from "../utils/buildThermalPrint";

const CATEGORY_COLOR_GROUPS = [
  {
    match: ["drink", "ouzo", "wine", "beer", "coffee", "juice", "slush"],
    style: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
  },
  {
    match: ["italian", "greek", "burger", "pizza"],
    style: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
  },
  {
    match: ["dessert", "sweet", "ice"],
    style: {
      bg: "bg-rose-50",
      border: "border-rose-200",
      text: "text-rose-700",
    },
  },
  {
    match: ["starters", "salads", "menu"],
    style: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
    },
  },
    {
    match: ["breakfast", "side", "omelettes", "toast", "sandwiches"],
    style: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      text: "text-teal-700",
    },
  },
];

const DEFAULT_CATEGORY_STYLE = {
  bg: "bg-slate-50",
  border: "border-slate-200",
  text: "text-slate-700",
};

export default function OrderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [notes, setNotes] = useState([]);

  const [table, setTable] = useState(null);
  const [tableNote, setTableNote] = useState("");

  const [items, setItems] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [activeItem, setActiveItem] = useState(null);

  // waiter flow
  const [step, setStep] = useState("category");
  const [activeCategory, setActiveCategory] = useState("");

  const [mode, setMode] = useState("new"); // "new" | "history"
  const [pastOrders, setPastOrders] = useState([]);

  const categories = Array.from(
    new Set(products.map(p => p.category || "Other"))
  );


    
  async function handleReprint(order) {
  try {
    const printPayload = buildThermalPrint(
      {
        table: order.table,
        tableNote: order.tableNote,
        items: order.items,
        createdAt: order.createdAt,
      },
      products
    );

    // TEMP: replace later with bluetooth print
    console.log("REPRINT PAYLOAD:\n", printPayload);

    // mark as printed (temporary success)
    await updateOrderPrintStatus(order._id, { success: true });

    // refresh past orders
    fetchOrdersByTable(table._id).then(setPastOrders);

    alert("Reprint successful");
  } catch (err) {
    console.error(err);

    await updateOrderPrintStatus(order._id, {
      success: false,
      error: err.message,
    });

    alert("Reprint failed");
  }
}



  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0]);
      
    }
  }, [categories]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [t, p, n] = await Promise.all([
          fetchActiveTables(),
          fetchActiveProducts(),
          fetchActiveNotes(),
        ]);
        setTables(t);
        setProducts(p);
        setNotes(n);
      } catch (err) {
        console.error(err);
        setError("Failed to load kitchen data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!table) return;
    fetchOrdersByTable(table._id).then(setPastOrders);
  }, [table]);

  function addItem(product) {
    if (!table) return;

    const newItem = {
      id: crypto.randomUUID(),
      productId: product._id,
      name: product.name,
      notes: [],
      customNote: "",
      allowCustomNote: product.allowCustomNote,
    };

    setItems(prev => [...prev, newItem]);

    const hasModifiers =
      (product.noteTemplateIds && product.noteTemplateIds.length > 0) ||
      product.allowCustomNote;

    if (hasModifiers) setActiveItem(newItem);
  }

  if (loading) {
    return <div className="text-center py-10 text-slate-500">Loading…</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-600">{error}</div>;
  }

  function OrderStatusBadge({ status }) {
    if (status === "printed") {
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          🟢 Printed
        </span>
      );
    }

    if (status === "failed") {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          🔴 Print failed
        </span>
      );
    }

    return (
      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
        🟡 Pending
      </span>
    );
  }

  function normalizeCategory(cat) {
    return cat?.trim().toLowerCase();
  }
function getCategoryStyle(category) {
  if (!category) return DEFAULT_CATEGORY_STYLE;

  const normalized = category.toLowerCase();

  for (const group of CATEGORY_COLOR_GROUPS) {
    if (group.match.some(word => normalized.includes(word))) {
      return group.style;
    }
  }

  return DEFAULT_CATEGORY_STYLE;
}

  return (
    <div className="space-y-4 pb-24">
      {/* TABLE SELECTOR — ALWAYS VISIBLE */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <label className="block text-xs font-medium text-slate-500">
          TABLE
        </label>

        <select
          value={table?._id || ""}
          onChange={(e) => {
          const selected = tables.find(t => t._id === e.target.value) || null;
          setTable(selected);
          setMode("new");
          setStep("category");
          setItems([]);
        }}
          className="w-full rounded-xl border px-3 py-3 text-base"
        >
          <option value="">Select table…</option>
          {tables.map(t => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* EVERYTHING BELOW REQUIRES A TABLE */}
      {!table && (
        <div className="text-center text-slate-400 py-10">
          Select a table to start ordering
        </div>
      )}

      {table && (
        <>
          {/* MODE SWITCH */}
          <div className="flex gap-3">
            <button
              onClick={() => setMode("new")}
              className={`rounded-xl px-4 py-2 text-sm ${
                mode === "new"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100"
              }`}
            >
              ➕ New Order
            </button>

            <button
              onClick={() => setMode("history")}
              className={`rounded-xl px-4 py-2 text-sm ${
                mode === "history"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100"
              }`}
            >
              🧾 Past Orders ({pastOrders.length})
            </button>
          </div>

          {/* ORDER NOTE */}
          <input
            value={tableNote}
            onChange={(e) => setTableNote(e.target.value)}
            placeholder="Order's name (optional)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />

          {/* HISTORY MODE */}
          {mode === "history" && (
            <div className="space-y-4">
              {pastOrders.length === 0 && (
                <div className="text-center text-slate-400 py-10">
                  No orders in the last 24 hours
                </div>
              )}

              {pastOrders.map(order => (
                <div
                  key={order._id}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                >
                  {/* HEADER */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      {order.tableNote} - {new Date(order.createdAt).toLocaleTimeString()}
                    </div>

                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* ITEMS */}
                  <div className="space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="text-sm">
                        • {item.name}
                      </div>
                    ))}
                  </div>

                  {/* ACTIONS */}
                  {(order.status === "pending" || order.status === "failed") && (
                    <button
                      onClick={() => handleReprint(order)}
                      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      🔁 Reprint
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}


          {/* NEW ORDER MODE */}
          {mode === "new" && step === "category" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
            {categories.map(cat => {
               
              const style = getCategoryStyle(cat);

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setStep("products");
                  }}
                  className={[
                    "rounded-2xl px-4 py-6 border transition shadow-sm",
                    "flex flex-col items-start gap-2",
                    style.bg,
                    style.border,
                    "hover:brightness-[0.97]",
                  ].join(" ")}
                >
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Category
                  </div>

                  <div className={`text-lg font-semibold ${style.text}`}>
                    {cat}
                  </div>

                  <div className="text-xs text-slate-500">
                    Tap to view items
                  </div>
                </button>
              );
            })}

            </div>
          
          )}
          

          {mode === "new" && step === "products" && (
            <>
              <button
                onClick={() => setStep("category")}
                className="text-sm"
              >
                ← Back
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products
                  .filter(p => p.category === activeCategory && p.active)
                  .map(p => (
                    <button
                      key={p._id}
                      onClick={() => addItem(p)}
                      className="rounded-2xl border bg-slate-50 px-3 py-6"
                    >
                      <div className="font-semibold">{p.name}</div>
                    </button>
                  ))}
              </div>
            </>
          )}

          {/* BOTTOM ACTION BAR */}
          {mode === "new" && (
            <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
              <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    🧾 Order · {items.length} item
                    {items.length === 1 ? "" : "s"}
                  </div>
                  <div className="text-xs text-slate-500">
                    Table: {table.name}
                    {tableNote ? ` — ${tableNote}` : ""}
                  </div>
                </div>

                <button
                  onClick={() => setReviewOpen(true)}
                  disabled={items.length === 0}
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-medium transition",
                    items.length > 0
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  View
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODIFIER MODAL */}
      <ModifierModal
        open={!!activeItem}
        item={activeItem}
        noteTemplates={
          products
            .find(p => p._id === activeItem?.productId)
            ?.noteTemplateIds?.map(n => n.label) || []
        }
        allowCustomNote={activeItem?.allowCustomNote}
        onSkip={() => setActiveItem(null)}
        onSave={(patch) => {
          setItems(prev =>
            prev.map(i =>
              i.id === activeItem.id ? { ...i, ...patch } : i
            )
          );
          setActiveItem(null);
        }}
      />

      {/* ORDER REVIEW */}
      <OrderSheet
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        table={table}
        tableNote={tableNote}
        items={items}
        setItems={setItems}
        products={products}
      />
    </div>
  );
}
