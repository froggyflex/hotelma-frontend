import { useEffect, useState, useMemo } from "react";
import axios from "axios";

import {
  fetchActiveProducts,
  fetchActiveTables,
  fetchActiveNotes,
  fetchActiveOrderByTable,
  appendItemsToOrder,
  markItemDelivered,
  closeOrder,
  createKitchenOrder
} from "../services/kitchenOrdersApi";

import ModifierModal from "../components/ModifierModal";
import ActiveOrderPanel from "../components/ActiveOrderPanel";
import TableMap from "../components/TableMap";
import { buildThermalPrint } from "../utils/buildThermalPrint";

/* ---------------- CATEGORY STYLES ---------------- */

const CATEGORY_COLOR_GROUPS = [
  { match: ["drink", "wine", "beer", "coffee", "juice"], bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { match: ["food", "pizza", "burger", "pasta"], bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  { match: ["dessert", "sweet"], bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
];

const DEFAULT_CATEGORY_STYLE = {
  bg: "bg-slate-50",
  border: "border-slate-200",
  text: "text-slate-700",
};

function getCategoryStyle(cat) {
  if (!cat) return DEFAULT_CATEGORY_STYLE;
  const c = cat.toLowerCase();
  return CATEGORY_COLOR_GROUPS.find(g => g.match.some(m => c.includes(m))) ?? DEFAULT_CATEGORY_STYLE;
}

/* ---------------- COMPONENT ---------------- */

export default function OrderPage() {
  /* ---------- STATE ---------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [notes, setNotes] = useState([]);

  const [table, setTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [draftItems, setDraftItems] = useState([]);

  const [activeItem, setActiveItem] = useState(null);

  const [step, setStep] = useState("category");
  const [activeCategory, setActiveCategory] = useState("");

  const [tableMap, setTableMap] = useState(null);

  /* ---------- MEMOS ---------- */

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category || "Other")));
  }, [products]);

  const waiterTables = useMemo(() => {
    if (!tableMap?.tables) return [];
    return tables.map(t => ({
      ...t,
      _pos: tableMap.tables.find(p => String(p.tableId) === String(t._id)),
    }));
  }, [tables, tableMap]);

  /* ---------- EFFECTS ---------- */

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
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/table-map`)
      .then(res => setTableMap(res.data))
      .catch(() => setTableMap(null));
  }, []);

  useEffect(() => {
    if (!table) return;

    async function loadActive() {
      const order = await fetchActiveOrderByTable(table._id);
      setActiveOrder(order);
      setDraftItems([]);
      setStep("category");
    }

    loadActive();
  }, [table]);

  /* ---------- EARLY RETURNS ---------- */

  if (loading) return <div className="py-10 text-center">Loading…</div>;
  if (error) return <div className="py-10 text-center text-red-600">{error}</div>;

  /* ---------- HELPERS ---------- */

  function openTable(t) {
    setTable(t);
    setActiveItem(null);
  }

  function updateDraftItem(id, patch) {
    setDraftItems(prev =>
      prev.map(i => (i.id === id ? { ...i, ...patch } : i))
    );
  }

  function editDraftItem(item) {
    setActiveItem(item);
  }

  function removeDraftItem(id) {
    setDraftItems(prev => prev.filter(i => i.id !== id));
  }
  function getDraftSignature(item) {
    const notesKey = (item.notes || []).slice().sort().join("|");
    const customKey = item.customNote?.trim() || "";

    return `${item.productId}__${notesKey}__${customKey}`;
  }

  function addItem(product) {
    if (!table) return;

    const newItem = {
      id: crypto.randomUUID(),
      productId: product._id,
      name: product.name,
      qty: 1,
      notes: [],
      customNote: "",
      allowCustomNote: product.allowCustomNote,
    };

    const hasModifiers =
      (product.noteTemplateIds?.length > 0) ||
      product.allowCustomNote;

    if (hasModifiers) {
      setActiveItem(newItem);
    } else {
          setDraftItems(prev => {
          const candidate = newItem;
          const signature = getDraftSignature(candidate);

          const existing = prev.find(
            i => getDraftSignature(i) === signature
          );

          if (existing) {
            return prev.map(i =>
              i.id === existing.id
                ? { ...i, qty: i.qty + 1 }
                : i
            );
          }

          return [...prev, candidate];
        });
    }
  }

async function sendNewItems() {
  if (draftItems.length === 0) return;

  let order = activeOrder;

  // 🟢 FIRST SEND FOR THIS TABLE → CREATE ORDER
  if (!order) {
    order = await createKitchenOrder({
      table: {
        id: table._id,
        name: table.name,
      },
      items: draftItems,
    });
  } 
  // 🟡 SUBSEQUENT SENDS → APPEND
  else {
    await appendItemsToOrder(order._id, draftItems);
  }

  // 🖨 PRINT ONLY NEW ITEMS
  const payload = buildThermalPrint({
    table,
    items: draftItems,
  });

  console.log("PRINT:\n", payload);
  // bluetoothPrint(payload) later

  setDraftItems([]);

  const refreshed = await fetchActiveOrderByTable(table._id);
  setActiveOrder(refreshed);
}


  async function markDelivered(itemId) {
    await markItemDelivered(itemId);
    const refreshed = await fetchActiveOrderByTable(table._id);
    setActiveOrder(refreshed);
  }

  async function closeTableHandler() {
    if (!activeOrder) return;
    if (!window.confirm(`Close table ${table.name}?`)) return;

    await closeOrder(activeOrder._id);
    setActiveOrder(null);
    setTable(null);
    setDraftItems([]);
  }

  /* ---------- RENDER ---------- */

  return (
    <div className="space-y-4 pb-24">

      <TableMap
        tables={waiterTables}
        layout={{
          width: tableMap?.width ?? 1600,
          height: tableMap?.height ?? 900,
          tableSize: tableMap?.tableSize ?? 120,
          doors: tableMap?.doors ?? [],
        }}
        selectedTableId={table?._id}
        onSelect={openTable}
      />

      {!table && (
        <div className="py-10 text-center text-slate-400">
          Select a table to start ordering
        </div>
      )}

      {table && (
        <>
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              {activeOrder ? "🟢 Active Table" : "🟡 New Table"}
            </div>

            {activeOrder && (
              <button
                onClick={closeTableHandler}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
              >
                🔒 Close Table
              </button>
            )}
          </div>

          {table && (
            <ActiveOrderPanel
              order={activeOrder}
              draftItems={draftItems}
              onSendNewItems={sendNewItems}
              onMarkDelivered={markDelivered}
              onCloseTable={closeTableHandler}
              onUpdateDraftItem={updateDraftItem}
              onEditDraftItem={editDraftItem}
              onRemoveDraftItem={removeDraftItem}
            />

          )}


          {step === "category" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map(cat => {
                const s = getCategoryStyle(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setStep("products");
                    }}
                    className={`rounded-2xl border px-4 py-6 ${s.bg} ${s.border}`}
                  >
                    <div className={`font-semibold ${s.text}`}>{cat}</div>
                  </button>
                );
              })}
            </div>
          )}

          {step === "products" && (
            <>
              <button onClick={() => setStep("category")} className="text-sm">
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
        </>
      )}

    <ModifierModal
      open={!!activeItem}
      item={activeItem}
      noteTemplates={
        products
          .find(p => p._id === activeItem?.productId)
          ?.noteTemplateIds
          ?.map(n => n.label) || []
      }
      allowCustomNote={activeItem?.allowCustomNote}
      onSkip={() => setActiveItem(null)}
      onSave={(patch) => {
        setDraftItems(prev => {
          const candidate = {
            ...activeItem,
            ...patch,
          };

          const signature = getDraftSignature(candidate);

          const existing = prev.find(
            i => getDraftSignature(i) === signature
          );

          // 🔁 MERGE
          if (existing) {
            return prev.map(i =>
              i.id === existing.id
                ? { ...i, qty: i.qty + candidate.qty }
                : i
            );
          }

          // ➕ NEW LINE
          return [...prev, candidate];
        });

        setActiveItem(null);
      }}
    />


    </div>
  );
}
