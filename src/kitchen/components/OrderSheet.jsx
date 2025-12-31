import { useState } from "react";
import ModifierModal from "./ModifierModal";
import { createKitchenOrder } from "../services/kitchenOrdersApi";
import {
  updateOrderPrintStatus,
} from "../services/kitchenOrdersApi";
import { buildThermalPrint } from "../utils/buildThermalPrint";

export default function OrderSheet({
  open,
  onClose,
  table,
  tableNote,
  items,
  setItems,
  products,
}) {
  const [editingItem, setEditingItem] = useState(null);

  if (!open) return null;

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  // 🔹 GROUP ITEMS BY CATEGORY
  const groupedItems = items.reduce((acc, item) => {
    const product = products.find(p => p._id === item.productId);
    const category = product?.category || "Other";

    if (!acc[category]) acc[category] = [];
    acc[category].push(item);

    return acc;
  }, {});

async function sendOrder() {
  try {
    // 1️⃣ Save order FIRST
    const order = await createKitchenOrder({
      table: { id: table._id, name: table.name },
      tableNote,
      items,
    });

    // 2️⃣ Build thermal payload
    const printPayload = buildThermalPrint(
      {
        table,
        tableNote,
        items,
        createdAt: order.createdAt,
      },
      products
    );

    // 3️⃣ Attempt print (placeholder for now)
    try {
      // later: bluetoothPrint(printPayload)
      console.log("PRINT PAYLOAD:\n", printPayload);

      // 4️⃣ Mark as printed (TEMP: always success)
      await updateOrderPrintStatus(order._id, { success: true });
    } catch (printErr) {
      // 5️⃣ Mark as failed
      await updateOrderPrintStatus(order._id, {
        success: false,
        error: printErr.message,
      });
    }

    setItems([]);
    onClose();
    alert("Order saved");
  } catch (err) {
    console.error(err);
    alert("Failed to send order");
  }
}


  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-auto">
        {/* HEADER */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Order Review</div>
            <div className="text-xs text-slate-500">
              Table {table.name}
              {tableNote ? ` — ${tableNote}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-4 space-y-6">
          {items.length === 0 && (
            <div className="text-center text-slate-400 py-10">
              No items in order
            </div>
          )}

          {Object.entries(groupedItems).map(([category, categoryItems]) => (
            <div key={category} className="space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-500">
                {category}
              </div>

              {categoryItems.map(item => (
                <OrderItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => setEditingItem(item)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <button
          onClick={sendOrder}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          Send to kitchen
        </button>
      </div>

      {/* MODIFIER MODAL (ONLY ONE, CONTROLLED HERE) */}
      <ModifierModal
        open={!!editingItem}
        item={editingItem}
        noteTemplates={
          products
            .find(p => p._id === editingItem?.productId)
            ?.noteTemplateIds?.map(n => n.label) || []
        }
        allowCustomNote={editingItem?.allowCustomNote}
        onSkip={() => setEditingItem(null)}
        onSave={(patch) => {
          setItems(prev =>
            prev.map(i =>
              i.id === editingItem.id ? { ...i, ...patch } : i
            )
          );
          setEditingItem(null);
        }}
      />
    </div>
  );
}

function OrderItemRow({ item, onEdit, onRemove }) {
  return (
    <div
      onClick={onEdit}
      className="rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer hover:bg-slate-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium flex items-center gap-1">
            {item.name}
            {(item.notes?.length > 0 || item.customNote) && (
              <span title="Has instructions">📝</span>
            )}
          </div>

          {item.notes?.length > 0 && (
            <ul className="mt-1 text-xs text-slate-600 list-disc list-inside">
              {item.notes.map(n => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}

          {item.customNote && (
            <div className="text-xs text-slate-600 mt-1">
              * {item.customNote}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-slate-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
