import { useEffect, useState } from "react";
import {
  fetchActiveProducts,
  fetchActiveTables,
  fetchActiveNotes,
} from "../services/kitchenOrdersApi";

import OrderSheet from "../components/OrderSheet";
import NotesModal from "../components/NotesModal";

export default function OrderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [notes, setNotes] = useState([]);

  const [table, setTable] = useState("");
  const [items, setItems] = useState([]);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeItemForNotes, setActiveItemForNotes] = useState(null);


  // map notes per product for quick lookup
  const notesByProductId = notes.reduce((acc, n) => {
    acc[n._id] = acc[n._id] || [];
    return acc;
  }, {});

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const [tablesData, productsData, notesData] = await Promise.all([
          fetchActiveTables(),
          fetchActiveProducts(),
          fetchActiveNotes(),
        ]);

        setTables(tablesData);
        setProducts(productsData);
        setNotes(notesData);
      } catch (err) {
        console.error(err);
        setError("Failed to load kitchen data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

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

    setItems((prev) => [...prev, newItem]);

    const hasNotes =
        (product.noteTemplateIds && product.noteTemplateIds.length > 0) ||
        product.allowCustomNote;

    // 🔥 AUTO-OPEN NOTES IF APPLICABLE
    if (hasNotes) {
        setActiveItemForNotes(newItem);
    }
    }

  if (loading) {
    return (
      <div className="text-center text-slate-500 py-10">
        Loading kitchen data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-10">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* TABLE SELECTOR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-xs font-medium text-slate-500">
          TABLE
        </label>

        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Select table…</option>
          {tables.map((t) => (
            <option key={t._id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        {!table && (
          <p className="mt-2 text-sm text-amber-600">
            Select a table to start taking an order.
          </p>
        )}
      </div>

      {/* PRODUCT GRID */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Products</div>
          <div className="text-xs text-slate-500">
            Tap to add (1 tap = 1 item)
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((p) => (
            <button
              key={p._id}
              onClick={() => addItem(p)}
              disabled={!table}
              className={[
                "rounded-2xl border px-3 py-6 text-left shadow-sm transition",
                table
                  ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  : "border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed",
              ].join(" ")}
            >
              <div className="text-base font-semibold">{p.name}</div>
              {p.category && (
                <div className="text-xs text-slate-500 mt-1">
                  {p.category}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM ORDER BAR */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              🧾 Order · {items.length} item{items.length === 1 ? "" : "s"}
            </div>
            <div className="text-xs text-slate-500">
              {table ? `Table: ${table}` : "No table selected"}
            </div>
          </div>

            <button
            onClick={() => setReviewOpen(true)}
            disabled={!table || items.length === 0}
            className={[
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                table && items.length > 0
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-slate-200 text-slate-500 cursor-not-allowed",
            ].join(" ")}
            >
            View
            </button>
            {activeItemForNotes && (
            <NotesModal
                item={activeItemForNotes}
                noteTemplates={
                products.find(p => p._id === activeItemForNotes.productId)
                    ?.noteTemplateIds || []
                }
                onSave={(patch) => {
                setItems(prev =>
                    prev.map(i =>
                    i.id === activeItemForNotes.id
                        ? { ...i, ...patch }
                        : i
                    )
                );
                setActiveItemForNotes(null);
                }}
                onSkip={() => {
                setActiveItemForNotes(null);
                }}
            />
            )}
            <OrderSheet
                open={reviewOpen}
                onClose={() => setReviewOpen(false)}
                table={table}
                items={items}
                setItems={setItems}
                notesByProductId={notesByProductId}
            />

        </div>
      </div>
    </div>
  );

}
