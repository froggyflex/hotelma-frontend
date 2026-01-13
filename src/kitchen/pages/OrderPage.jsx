import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { enqueuePrintJob } from "../services/printQueue";
import { v4 as uuidv4 } from "uuid";

import {
  fetchActiveProducts,
  fetchActiveTables,
  fetchActiveNotes,
  fetchActiveOrderByTable,
  appendItemsToOrder,
  markItemDelivered,
  markOrderPrinted,
  closeOrder,
  createKitchenOrder,
  updateOrderName,  
} from "../services/kitchenOrdersApi";

import {
  printSafely
} from "../services/printService";

import ModifierModal from "../components/ModifierModal";
import ActiveOrderPanel from "../components/ActiveOrderPanel";
import TableMap from "../components/TableMap";
import { buildThermalPrint } from "../utils/buildThermalPrint";

import i18n from "i18next";
import { useTranslation } from "react-i18next";

/* ---------------- CATEGORY STYLES ---------------- */

const CATEGORY_COLOR_GROUPS = [
  // {
  //   match: ["drink", "wine", "beer", "coffee", "juice"],
  //   bg: "bg-blue-50",
  //   border: "border-blue-200",
  //   text: "text-blue-700",
  // },
  // {
  //   match: ["food", "pizza", "burger", "pasta"],
  //   bg: "bg-emerald-50",
  //   border: "border-emerald-200",
  //   text: "text-emerald-700",
  // },
  // {
  //   match: ["dessert", "sweet"],
  //   bg: "bg-rose-50",
  //   border: "border-rose-200",
  //   text: "text-rose-700",
  // },
];

const DEFAULT_CATEGORY_STYLE = {
  bg: "bg-slate-50",
  border: "border-slate-200",
  text: "text-slate-700",
};

function getCategoryStyle(cat) {
  if (!cat) return DEFAULT_CATEGORY_STYLE;
  const c = String(cat).toLowerCase();
  return (
    CATEGORY_COLOR_GROUPS.find((g) => g.match.some((m) => c.includes(m))) ??
    DEFAULT_CATEGORY_STYLE
  );
}

function getDraftSignature(item) {
  const notesKey = (item.notes || []).slice().sort().join("|");
  const customKey = (item.customNote || "").trim();
  return `${item.productId}__${notesKey}__${customKey}`;
}

/* ---------------- COMPONENT ---------------- */

export default function OrderPage() {
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [notes, setNotes] = useState([]); // kept (may be used later)

  const [table, setTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);

  // "draft" = items not yet sent to kitchen
  const [draftItems, setDraftItems] = useState([]);

  // item currently in modifier modal (either new or editing)
  const [activeItem, setActiveItem] = useState(null);

  const [step, setStep] = useState("category");
  const [activeCategory, setActiveCategory] = useState("");

  const [tableMap, setTableMap] = useState(null);

  // nickname shown on ticket (order-level)
  const [orderName, setOrderName] = useState("");
  const [openTableIds, setOpenTableIds] = useState([]);
  
  const [openTables, setOpenTables] = useState([]);

  const { t } = useTranslation(); 

  /* ---------- MEMOS ---------- */

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category || "Other")));
  }, [products]);

  const waiterTables = useMemo(() => {
    if (!tableMap?.tables) return [];
    return tables.map((t) => ({
      ...t,
      _pos: tableMap.tables.find((p) => String(p.tableId) === String(t._id)),
    }));
  }, [tables, tableMap]);
 
  const pendingItems = activeOrder?.items?.filter(
    item => item.status !== "delivered" && item.printed !== true
  )?? [];

  const printerHealth = usePrinterHealth();
  /* ---------- LOAD BASE DATA ---------- */

  function usePrinterHealth() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const id = setInterval(() => {
      try {
        // Prefer new native bridge
        if (window.AndroidPrinter?.getHealth) {
          const res = JSON.parse(window.AndroidPrinter.getHealth());
          setHealth(res);
          return;
        }
        // Fallback to legacy bridge (older builds)
        if (window.AndroidPrinter?.getHealth) {
          const res = JSON.parse(window.AndroidPrinter.getHealth());
          setHealth(res);
          return;
        }
        setHealth({ ok: false });
      } catch (e) {
        setHealth({ ok: false });
      }
    }, 4000);

    return () => clearInterval(id);
  }, []);

  return health;
}

  useEffect(() => {
      fetch(`${import.meta.env.VITE_API_URL}/api/kitchen/orders/active`)
        .then(res => res.json())
        .then(setOpenTableIds)
        .catch(() => setOpenTableIds([]));
    }, []);

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
      } catch (e) {
        console.error(e);
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
      .then((res) => setTableMap(res.data))
      .catch(() => setTableMap(null));
  }, []);

  /* ---------- LOAD ACTIVE ORDER WHEN TABLE CHANGES (SINGLE SOURCE OF TRUTH) ---------- */

  useEffect(() => {
    if (!table) return;

    let cancelled = false;

    async function loadActive() {
      try {
        const order = await fetchActiveOrderByTable(table._id);
        if (cancelled) return;

        setActiveOrder(order || null);
        setDraftItems([]);
        setStep("category");

        if (order) setOrderName(order.orderName || "");
        else setOrderName("");
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          // keep UI usable even if fetch fails
          setActiveOrder(null);
          setDraftItems([]);
          setStep("category");
          setOrderName("");
        }
      }
    }

    loadActive();
    return () => {
      cancelled = true;
    };
  }, [table]);

  /* ---------- EARLY RETURNS ---------- */

  if (loading) return <div className="py-10 text-center">Loading…</div>;
  if (error) return <div className="py-10 text-center text-red-600">{error}</div>;

  /* ---------- HELPERS ---------- */

  function retryPrintPending() {
    if (!activeOrder || pendingItems.length === 0) return;

    const printPayload = buildThermalPrint(
      {
        table,
        orderName: activeOrder.orderName,
        items: pendingItems,
        createdAt: activeOrder.createdAt,
      },
      products
    );

    const itemIds = pendingItems.map((i) => i._id);
    const attemptId = uuidv4();

    enqueuePrintJob({
      print: async () => {
        // Prefer native ACK bridge (Android WebView app)
        if (window.AndroidPrinter?.printText) {
          const res = JSON.parse(window.AndroidPrinter.printText(printPayload));
          if (!res.ok) throw new Error(res.code || "PRINT_FAILED");
          return;
        }

        // Fallback legacy bridge
        if (window.AndroidPrinter?.print) {
          await printSafely(printPayload);
          return;
        }

        throw new Error("ANDROID_BRIDGE_NOT_AVAILABLE");
      },

      onSuccess: async () => {
        // Wait for printer buffer to flush
        await new Promise((r) => setTimeout(r, 1200));

        // Confirm print in backend (idempotent)
        await markOrderPrinted(activeOrder._id, itemIds, attemptId);

        const refreshed = await fetchActiveOrderByTable(table._id);
        setActiveOrder(refreshed || activeOrder);
      },

      onError: (err) => {
        console.warn("Print failed, items remain pending", err);
      },
    });
  }

  function openTable(t) {
    setTable(t);
    setActiveItem(null);
  }

  function updateDraftItem(id, patch) {
    setDraftItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function editDraftItem(item) {
    setActiveItem(item);
  }

  function removeDraftItem(id) {
    setDraftItems((prev) => prev.filter((i) => i.id !== id));
  } [];

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
      (product.noteTemplateIds?.length > 0) || product.allowCustomNote;

    if (hasModifiers) {
      // open modal first
      setActiveItem(newItem);
      return;
    }

    // no modifiers -> group immediately
    setDraftItems((prev) => {
      const signature = getDraftSignature(newItem);
      const existing = prev.find((i) => getDraftSignature(i) === signature);
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, newItem];
    });
  }

async function sendNewItems() {
  if (!table) return;
  if (!draftItems || draftItems.length === 0) return;

  try {
    let order;

    // 1️⃣ SAVE FIRST (SOURCE OF TRUTH)
    if (!activeOrder) {
      order = await createKitchenOrder({
        table: { id: table._id, name: table.name },
        orderName,
        items: draftItems.map(i => ({
          ...i,
          status: "new",
        })),
      });
    } else {
      order = await appendItemsToOrder(
        activeOrder._id,
        draftItems.map(i => ({
          ...i,
          status: "new",
        }))
      );
    }

    if (!order || !order._id) {
      throw new Error("Order not created correctly");
    }

    // 🔥 IMPORTANT: update UI immediately (even if printer is offline)
    setActiveOrder(order);

    // 🔑 IMPORTANT: get DB-backed items (WITH _id)
    const dbItemsToPrint = order.items.filter(
      item => item.status === "new" && item.printed === false
    );

    if (dbItemsToPrint.length === 0) {
      console.warn("No printable DB items found");
      return;
    }


    // 🔥 IMPORTANT: update UI immediately (even if printer is offline)
    setActiveOrder(order);

    const itemIds = dbItemsToPrint.map((i) => i._id);
    const attemptId = uuidv4();

    // 2️⃣ BUILD PRINT PAYLOAD (USING DB ITEMS)
    const printPayload = buildThermalPrint(
      {
        table,
        orderName,
        items: dbItemsToPrint,
        createdAt: order.createdAt,
      },
      products
    );

    enqueuePrintJob({
      print: async () => {
        // Prefer native ACK bridge (Android WebView app)
        if (window.AndroidPrinter?.printText) {
          const res = JSON.parse(window.AndroidPrinter.printText(printPayload));
          if (!res.ok) throw new Error(res.code || "PRINT_FAILED");
          return;
        }

        // Fallback legacy bridge
        if (window.AndroidPrinter?.print) {
          await printSafely(printPayload);
          return;
        }

        throw new Error("ANDROID_BRIDGE_NOT_AVAILABLE");
      },

      onSuccess: async () => {
        // Wait for printer buffer to flush
        await new Promise((r) => setTimeout(r, 1200));

        // Confirm print with attemptId (idempotent)
        await markOrderPrinted(order._id, itemIds, attemptId);

        const refreshed = await fetchActiveOrderByTable(table._id);
        setActiveOrder(refreshed || order);
      },

      onError: (err) => {
        console.warn("Print failed, items remain pending", err);
        // IMPORTANT: order is already saved; UI should still show it
      },
    });

    // 4️⃣ CLEAR DRAFT
    setDraftItems([]);

  } catch (e) {
    console.error(e);
    alert("Failed to send items");
  }
}



  async function markDelivered(itemId) {
    if (!table) return;

    //  Optimistic update (prevents UI from “jumping”)
    setActiveOrder((prev) => {
      if (!prev?.items) return prev;
      return {
        ...prev,
        items: prev.items.map((it) =>
          String(it._id) === String(itemId) ? { ...it, status: "delivered" } : it
        ),
      };
    });

    try {
      await markItemDelivered(itemId);

      // refresh from API
      const refreshed = await fetchActiveOrderByTable(table._id);

      //   IMPORTANT: do NOT set activeOrder to null if API glitches
      if (refreshed) {
        setActiveOrder(refreshed);
        // keep nickname in sync if backend returns it
        if (typeof refreshed.orderName === "string") {
          setOrderName(refreshed.orderName);
        }
      }
    } catch (e) {
      console.error(e);
      // If it failed, revert optimistic change by reloading order
      try {
        const fallback = await fetchActiveOrderByTable(table._id);
        if (fallback) setActiveOrder(fallback);
      } catch {
        // keep current UI; waiter can continue
      }
      alert("Failed to mark delivered");
    }
  }

  async function closeTableHandler() {
    if (!activeOrder) return;
    if (!window.confirm(`Close table ${table?.name}?`)) return;

    try {
      await closeOrder(activeOrder._id);
      setActiveOrder(null);
      setTable(null);
      setDraftItems([]);
      setOrderName("");
      setStep("category");
      
    } catch (e) {
      console.error(e);
      alert("Failed to close table");
    }
  }

  /* ---------- RENDER ---------- */

  return (
    <div className="space-y-4 pb-24">

      <button className= "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition" onClick={() => i18n.changeLanguage("it")}>🇮🇹</button>
      &nbsp;&nbsp;
      <button className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98] transition" onClick={() => i18n.changeLanguage("en")}>🇬🇧</button>
     
      <div className="flex items-center gap-2 text-sm">
      {printerHealth?.ok ? (
        <span className="text-green-600">🖨 Printer connected</span>
      ) : (
        <span className="text-red-600">🖨 Printer offline</span>
      )}
    </div>
      
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
        openTableIds={openTableIds}
      />

      {!table && (
        <div className="py-10 text-center text-slate-400">
          {t("tables.selectTable")}
        </div>
      )}

      {table && (
        <>
          <div className="flex items-center justify-between">
            <div className="font-semibold">
              {activeOrder ? "🟢 "+t("tables.activeTable") : "🟡 "+t("tables.newTable") }
            </div>

            {activeOrder && (
              <button
                onClick={closeTableHandler}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
              >
                🔒 {t("tables.close_table")}
              </button>
            )}
          </div>

          {/* Order nickname */}
          <div className="rounded-xl border bg-white p-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {t("order.orderName")}  
            </label>

            <input
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              placeholder={t("order.placeholder")}  
              className="w-full rounded-lg border px-3 py-2 text-sm"
              onBlur={async () => {
                // update only if there is an existing active order
                if (!activeOrder?._id) return;
                try {
                  const updated = await updateOrderName(activeOrder._id, orderName);
                  // keep in sync with backend response
                  if (updated?.orderName !== undefined) {
                    setOrderName(updated.orderName || "");
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
            />
          </div>

          {pendingItems.length > 0 && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <div className="text-sm font-medium text-amber-700">
              ⚠ {pendingItems.length} item(s) pending print
            </div>

            <button
              onClick={retryPrintPending}
              className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              🔁 Retry print
            </button>
          </div>
        )}

          {/* Active order panel (must show even when activeOrder is null) */}
          <ActiveOrderPanel
            order={activeOrder}
            products={products}
            draftItems={draftItems}
            onSendNewItems={sendNewItems}
            onMarkDelivered={markDelivered}
            onCloseTable={closeTableHandler}
            onUpdateDraftItem={updateDraftItem}
            onEditDraftItem={editDraftItem}
            onRemoveDraftItem={removeDraftItem}
            
          />

          {/* Category selection */}
          {step === "category" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.map((cat) => {
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

          {/* Product grid */}
          {step === "products" && (
            <>
              <button onClick={() => setStep("category")} className="text-sm">
                {t("order.back")}  
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products
                  .filter((p) => (p.category || "Other") === activeCategory && p.active)
                  .map((p) => (
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

      {/* Modifier modal */}
      <ModifierModal
        open={!!activeItem}
        item={activeItem}
        noteTemplates={
          products
            .find((p) => p._id === activeItem?.productId)
            ?.noteTemplateIds?.map((n) => n.label) || []
        }
        allowCustomNote={activeItem?.allowCustomNote}
        onSkip={() => setActiveItem(null)}
        onSave={(patch) => {
          setDraftItems((prev) => {
            const original = prev.find((i) => i.id === activeItem.id);

            // 🟢 Case A: NEW item (not yet in draft)
            if (!original) {
              const candidate = { ...activeItem, ...patch, qty: 1 };
              const signature = getDraftSignature(candidate);

              const existing = prev.find((i) => getDraftSignature(i) === signature);
              if (existing) {
                return prev.map((i) =>
                  i.id === existing.id ? { ...i, qty: i.qty + 1 } : i
                );
              }
              return [...prev, candidate];
            }

            // 🟡 Case B: EDIT existing grouped item -> split ONE unit
            const editedUnit = {
              ...original,
              ...patch,
              qty: 1,
              id: crypto.randomUUID(),
            };

            const editedSig = getDraftSignature(editedUnit);

            let next = prev
              .map((i) =>
                i.id === original.id ? { ...i, qty: i.qty - 1 } : i
              )
              .filter((i) => i.qty > 0);

            const existing = next.find((i) => getDraftSignature(i) === editedSig);
            if (existing) {
              return next.map((i) =>
                i.id === existing.id ? { ...i, qty: i.qty + 1 } : i
              );
            }

            return [...next, editedUnit];
          });

          setActiveItem(null);
        }}
      />
    </div>
  );
}
