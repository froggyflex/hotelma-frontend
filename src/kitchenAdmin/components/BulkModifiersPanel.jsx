import { useState } from "react";
import { bulkApplyNotesToCategory } from "../../services/kitchenApi";

export default function BulkModifiersPanel({ categories, notes, onDone }) {
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("merge");
  const [loading, setLoading] = useState(false);

  function toggle(noteId) {
    setSelected(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  }

  async function apply() {
    if (!category || selected.length === 0) return;

    setLoading(true);
    await bulkApplyNotesToCategory({
      category,
      noteTemplateIds: selected,
      mode,
    });
    setLoading(false);
    onDone();
  }

  return (
    <div className="rounded-xl border bg-white p-4 space-y-4">
      <div className="text-sm font-semibold">
        Bulk apply modifiers
      </div>

      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      >
        <option value="">Select category</option>
        {categories.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <div className="grid grid-cols-2 gap-2">
        {notes.map(n => (
          <label key={n._id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(n._id)}
              onChange={() => toggle(n._id)}
            />
            {n.label}
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <select
          value={mode}
          onChange={e => setMode(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="merge">Merge with existing</option>
          <option value="replace">Replace existing</option>
        </select>

        <button
          onClick={apply}
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        >
          {loading ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
