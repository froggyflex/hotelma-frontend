import { useState } from "react";
import { updateProductNotes } from "../../services/kitchenApi";

export default function ProductNotesEditor({
  product,
  allNotes,
  onUpdated,
}) {
  const [selected, setSelected] = useState(
    product.noteTemplateIds?.map(n => n._id) || []
  );
  const [saving, setSaving] = useState(false);

  function toggle(noteId) {
    setSelected(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  }

  async function save() {
    setSaving(true);
    const updated = await updateProductNotes(product._id, selected);
    setSaving(false);
    onUpdated(updated);
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="text-sm font-semibold">
        Modifiers for {product.name}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {allNotes.map(note => (
          <label
            key={note._id}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(note._id)}
              onChange={() => toggle(note._id)}
            />
            {note.label}
          </label>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
      >
        {saving ? "Saving…" : "Save modifiers"}
      </button>
    </div>
  );
}
