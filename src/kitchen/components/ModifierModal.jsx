import { useEffect, useState } from "react";

export default function ModifierModal({
  open,
  item,
  noteTemplates,
  allowCustomNote,
  onSave,
  onSkip,
}) {
  const [selected, setSelected] = useState([]);
  const [customNote, setCustomNote] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (item) {
      setQty(item.qty ?? 1);
    }
  }, [item]);

  useEffect(() => {
    if (open && item) {
      setSelected(item.notes || []);
      setCustomNote(item.customNote || "");
    }
  }, [open, item]);

  if (!open || !item) return null;

  function toggle(label) {
    setSelected((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  }

  function save() {
    onSave({
      noteTemplates,
      customNote,
      qty,
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onSkip}
      />

      {/* modal */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-auto">
        <div className="px-4 py-3 border-b border-slate-200">
          <div className="text-sm font-semibold">
            Modify {item.name}
          </div>
          <div className="text-xs text-slate-500">
            Ingredient changes
          </div>
        </div>

        <div className="p-4 space-y-3">
          {noteTemplates.length === 0 && !allowCustomNote && (
            <div className="text-sm text-slate-500">
              No modifications available.
            </div>
          )}

          {/* INGREDIENT TOGGLES */}
          {noteTemplates.map((n) => (
            <button
              key={n._id}
              onClick={() => toggle(n.label)}
              className={[
                "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium",
                selected.includes(n.label)
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-700",
              ].join(" ")}
            >
              {n.label}
              {selected.includes(n.label) && "✓"}
            </button>
          ))}


          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-full border"
            >
              −
            </button>

            <span className="text-lg font-semibold">{qty}</span>

            <button
              onClick={() => setQty(q => q + 1)}
              className="w-10 h-10 rounded-full border"
            >
              +
            </button>
          </div>

          {/* CUSTOM NOTE */}
          {allowCustomNote && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Custom instruction
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. No salt, well done"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-between">
          <button
            onClick={onSkip}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Skip
          </button>
          <button
            onClick={save}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
