import { useEffect, useState } from "react";
import {
  getKitchenProducts,
  createKitchenProduct,
  updateKitchenProduct,
  createKitchenProductsBulk
} from "../../services/kitchenApi";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = Array.from(
    new Set(products.map(p => p.category || "Other"))
  );


  const [form, setForm] = useState({
    name: "",
    category: "",
    active: true,
    allowCustomNote: true,
    noteTemplateIds: [],
  });

  async function load() {
    setLoading(true);
    const res = await getKitchenProducts();
    setProducts(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({
      name: "",
      category: "",
      active: true,
      allowCustomNote: true,
      noteTemplateIds: [],
    });
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      active: p.active,
      allowCustomNote: p.allowCustomNote,
      noteTemplateIds: p.noteTemplateIds?.map(n => n._id) || [],
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;

    if (editing) {
      await updateKitchenProduct(editing._id, form);
    } else {
      await createKitchenProduct(form);
    }

    setModalOpen(false);
    load();
  }

  async function toggleActive(p) {
    await updateKitchenProduct(p._id, { active: !p.active });
    load();
  }


  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" ||
      (p.category || "Other") === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const groupedProducts = filteredProducts.reduce((acc, p) => {
    const cat = p.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Products</h2>
          <p className="text-sm text-slate-500">
            Products available for kitchen ordering
          </p>
        </div>

        <button
          onClick={openCreate}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add product
        </button>

        <button
          onClick={() => setBulkOpen(true)}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
        >
          + Bulk add
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* SEARCH */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full sm:w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {/* CATEGORY FILTER */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
<div className="space-y-6">
  {Object.entries(groupedProducts).map(([category, items]) => (
    <div key={category}>
      {/* CATEGORY HEADER */}
      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
        {category}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Notes</th>
              <th className="px-4 py-2 text-left">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>

          <tbody>
            {items.map(p => (
              <tr
                key={p._id}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-2 font-medium">
                  {p.name}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {p.noteTemplateIds && p.noteTemplateIds.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                      📝 {p.noteTemplateIds.length}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(p)}
                    className={[
                      "rounded-full px-3 py-1 text-xs font-medium",
                      p.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-200 text-slate-600",
                    ].join(" ")}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </button>
                </td>

                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => openEdit(p)}
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
    </div>
  ))}

  {filteredProducts.length === 0 && (
    <div className="text-center text-slate-400 py-10">
      No products match your search.
    </div>
  )}
</div>


      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold mb-4">
              {editing ? "Edit product" : "New product"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allowCustomNote}
                  onChange={(e) =>
                    setForm({ ...form, allowCustomNote: e.target.checked })
                  }
                />
                <span className="text-sm">Allow custom note</span>
              </div>
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

      {bulkOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="text-base font-semibold mb-4">
            Bulk add products
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <input
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                placeholder="e.g. Drinks"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Items (one per line)
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={8}
                placeholder={`Coffee\nCola\nWater`}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setBulkOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const items = bulkText.split("\n");
                await createKitchenProductsBulk({
                  category: bulkCategory,
                  items,
                });
                setBulkOpen(false);
                setBulkText("");
                setBulkCategory("");
                load();
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add items
            </button>
          </div>
        </div>
      </div>
)}

    </div>
  );
}
