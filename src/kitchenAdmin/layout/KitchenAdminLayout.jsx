import { Outlet } from "react-router-dom";
import KitchenAdminSidebar from "./KitchenAdminSidebar";

export default function KitchenAdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          
          {/* SIDEBAR */}
          <KitchenAdminSidebar />

          {/* MAIN */}
          <main className="flex-1">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <h1 className="text-lg font-semibold">Kitchen Admin</h1>
                <p className="text-sm text-slate-500">
                  Manage products, note templates and tables
                </p>
              </div>

              <div className="px-6 py-6">
                <Outlet />
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  );
}
