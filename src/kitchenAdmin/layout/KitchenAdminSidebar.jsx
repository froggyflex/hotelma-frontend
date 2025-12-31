import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  [
    "block rounded-xl px-4 py-3 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-700 hover:bg-slate-100",
  ].join(" ");

export default function KitchenAdminSidebar() {
  return (
    <aside className="w-64 shrink-0">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
        
        {/* HEADER */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="text-sm font-semibold">Kitchen Admin</div>
          <div className="text-xs text-slate-500">
            Configuration
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 p-3 space-y-2">
          <NavLink to="/kitchen-admin/products" className={linkClass}>
            Products
          </NavLink>

          <NavLink to="/kitchen-admin/notes" className={linkClass}>
            Note Templates
          </NavLink>

          <NavLink to="/kitchen-admin/tables" className={linkClass}>
            Tables
          </NavLink>
          <NavLink
            to="/hub"
            className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            ← Back to Hub
          </NavLink>
        </nav>

        {/* FOOTER */}
        <div className="border-t border-slate-200 p-3">

        </div>
      </div>
    </aside>
  );
}
