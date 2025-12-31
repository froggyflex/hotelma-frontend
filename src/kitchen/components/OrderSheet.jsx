import NotesModal from "./NotesModal";

export default function OrderSheet({
  open,
  onClose,
  table,
  items,
  setItems,
  notesByProductId,
}) {
  if (!open) return null;

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateItem(id, patch) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
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
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Order Review</div>
            <div className="text-xs text-slate-500">Table {table}</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-3">
          {items.length === 0 && (
            <div className="text-center text-slate-400 py-10">
              No items in order
            </div>
          )}

          {items.map((item) => (
            <OrderItemRow
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
              onUpdate={(patch) => updateItem(item.id, patch)}
              noteTemplates={notesByProductId[item.productId] || []}
            />
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => alert("Next step: send to kitchen")}
          >
            Send to kitchen
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderItemRow({ item, onRemove, onUpdate, noteTemplates }) {
  const hasNotes =
    (item.notes && item.notes.length > 0) || item.customNote;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium flex items-center gap-1">
            {item.name}
            {hasNotes && <span title="Has notes">📝</span>}
          </div>
          {item.customNote && (
            <div className="text-xs text-slate-600 mt-1">
              {item.customNote}
            </div>
          )}
        </div>

        <button
          onClick={onRemove}
          className="text-slate-400 hover:text-red-600"
        >
          ✕
        </button>
      </div>

      <div className="mt-2">
        <NotesModal
          item={item}
          noteTemplates={noteTemplates}
          onSave={(patch) => onUpdate(patch)}
        />
      </div>
    </div>
  );
}
