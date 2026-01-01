import { useEffect, useState } from "react";
import {
  getKitchenNotes,
  createKitchenNote,
  updateKitchenNote,
} from "../../services/kitchenApi";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");

  async function load() {
    setLoading(true);
    const res = await getKitchenNotes();
    setNotes(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

      function openCreate() {
      setEditing(null);
      setLabel("");
      setCategory("");
      setModalOpen(true);
    }

    function openEdit(note) {
      setEditing(note);
      setLabel(note.label);
      setCategory(note.category || "");
      setModalOpen(true);
    }

      async function save() {
        if (!label.trim() || !category.trim()) return;

        const payload = { label, category };

        if (editing) {
          await updateKitchenNote(editing._id, payload);
        } else {
          await createKitchenNote(payload);
        }

        setModalOpen(false);
        load();
      }

  async function toggleActive(note) {
    await updateKitchenNote(note._id, { active: !note.active });
    load();
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Note Templates</h2>
          <p className="text-sm text-slate-500">
            Reusable notes attached to products (e.g. No onion, Extra cheese)
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add note
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Label</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}

            {!loading && notes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No notes yet
                </td>
              </tr>
            )}

            {notes.map((n) => (
              <tr
                key={n._id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium">{n.label}</td>
                <td className="px-4 py-3 text-slate-600">{n.category}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(n)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      n.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    {n.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(n)}
                    className="text-sm font-medium text-slate-700 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold mb-4">
              {editing ? "Edit note" : "New note"}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Coffee"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Label
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. No onion"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
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
    </div>
  );
}
