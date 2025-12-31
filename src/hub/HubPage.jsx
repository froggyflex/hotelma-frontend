import { useNavigate } from "react-router-dom";

export default function HubPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-4xl space-y-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome</h1>
          <p className="text-slate-500 mt-1">
            Select the application you want to use
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PMS */}
          <button
            onClick={() => navigate("/")}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">🏨 PMS</div>
            <p className="text-sm text-slate-500 mt-1">
              Bookings, rooms, invoices
            </p>
          </button>

          {/* Kitchen Admin */}
          <button
            onClick={() => navigate("/kitchen-admin")}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">🍔 Kitchen Admin</div>
            <p className="text-sm text-slate-500 mt-1">
              Products, notes, tables
            </p>
          </button>

          {/* Kitchen Orders */}
          <button
            onClick={() => navigate("/kitchen")}
            className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm hover:shadow-md transition"
          >
            <div className="text-lg font-semibold">📱 Kitchen Orders</div>
            <p className="text-sm text-slate-500 mt-1">
              Take orders (phone / tablet)
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
