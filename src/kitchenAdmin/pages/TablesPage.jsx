import { useEffect, useState } from "react";
import {
  getKitchenTables,
  createKitchenTable,
  updateKitchenTable,
} from "../../services/kitchenApi";

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  async function load() {
    setLoading(true);
    const res = await getKitchenTables();
    setTables(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(table) {
    setEditing(table);
    setName(table.name);
    setModalOpen(true);
  }

  async function save() {
    if (!name.trim()) return;

    if (editing) {
      await updateKitchenTable(editing._id, { name });
    } else {
      await createKitchenTable({ name });
    }

    setModalOpen(false);
    load();
  }

  async function toggleActive(table) {
    await updateKitchenTable(table._id, { active: !table.active });
    load();
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Tables</h2>
          <p className="text-sm text-slate-500">
            Tables used for order grouping (A1, Pool, Bar)
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add table
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
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

            {!loading && tables.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  No tables yet
                </td>
              </tr>
            )}

            {tables.map((t) => (
              <tr
                key={t._id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(t)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      t.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    {t.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(t)}
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
              {editing ? "Edit table" : "New table"}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1">
                Table name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. A1, Pool, Bar"
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
