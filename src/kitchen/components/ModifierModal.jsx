import { useState, useEffect } from "react";

export default function ModifierModal({
  open,
  item,
  noteTemplates = [],
  allowCustomNote = false,
  onSave,
  onSkip,
}) {
  // ✅ Hooks ALWAYS run
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [customNote, setCustomNote] = useState("");

  // ✅ Sync when item changes
  useEffect(() => {
    if (!item) return;
    setSelectedNotes(item.notes || []);
    setCustomNote(item.customNote || "");
  }, [item]);

  // ✅ Conditional render AFTER hooks
  if (!open || !item) return null;

  function toggleNote(note) {
    setSelectedNotes(prev =>
      prev.includes(note)
        ? prev.filter(n => n !== note)
        : [...prev, note]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 space-y-4">
        {/* HEADER */}
        <div className="text-lg font-semibold">
          {item.name}
        </div>

        {/* PREDEFINED MODIFIERS */}
        {noteTemplates.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-600">
              Modifiers
            </div>

            <div className="flex flex-wrap gap-2">
              {noteTemplates.map(note => {
                const active = selectedNotes.includes(note);
                return (
                  <button
                    key={note}
                    type="button"
                    onClick={() => toggleNote(note)}
                    className={`rounded-full px-3 py-1 text-sm border transition
                      ${
                        active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CUSTOM NOTE */}
        {allowCustomNote && (
          <div className="space-y-1">
            <label className="text-sm text-slate-600">
              Custom note
            </label>
            <input
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              placeholder="e.g. no sugar, well done"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onSkip}
            className="flex-1 rounded-xl border py-2 text-sm"
          >
            Skip
          </button>

          <button
            onClick={() =>
              onSave({
                notes: selectedNotes,
                customNote,
              })
            }
            className="flex-1 rounded-xl bg-slate-900 py-2 text-sm text-white"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
