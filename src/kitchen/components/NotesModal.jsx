import { useState } from "react";

export default function NotesModal({ item, noteTemplates, onSave, onSkip  }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes || []);
  const [customNote, setCustomNote] = useState(item.customNote || "");

  function toggle(label) {
    setNotes((prev) =>
      prev.includes(label)
        ? prev.filter((n) => n !== label)
        : [...prev, label]
    );
  }

  function save() {
    onSave({ notes, customNote });
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200"
      >
        Notes
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-auto">
            <div className="px-4 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold">{item.name}</div>
              <div className="text-xs text-slate-500">
                Item notes
              </div>
            </div>

            <div className="p-4 space-y-3">
              {noteTemplates.map((n) => (
                <label
                  key={n._id}
                  className="flex items-center gap-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={notes.includes(n.label)}
                    onChange={() => toggle(n.label)}
                  />
                  <span>{n.label}</span>
                </label>
              ))}

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Custom note
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Optional…"
                />
              </div>
            </div>

                <div className="p-4 border-t border-slate-200 flex justify-between">
                <button
                    onClick={() => {
                    onSkip?.();
                    }}
                    className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                    Skip
                </button>

                <button
                    onClick={save}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                    Save
                </button>
              
            </div>
          </div>
        </div>
      )}
    </>
  );
}
