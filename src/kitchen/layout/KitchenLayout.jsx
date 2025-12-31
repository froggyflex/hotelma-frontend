import { Outlet, NavLink } from "react-router-dom";

export default function KitchenLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Kitchen Orders</div>
            <div className="text-xs text-slate-500">Waiter mode</div>
          </div>

          <NavLink
            to="/hub"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Hub
          </NavLink>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 pb-24">
        <Outlet />
      </main>
    </div>
  );
}
