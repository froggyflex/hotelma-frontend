import React from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Rooms from "./pages/Rooms";
import Calendar from "./pages/Calendar";
import Housekeeping from "./pages/Housekeeping";
import InvoicesMain from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const navLinkClass = ({ isActive }) =>
  "px-3 py-2 rounded-md text-sm font-medium " +
  (isActive ? "bg-white text-blue-700" : "hover:bg-blue-500/30");

/* ========================= */
/* APP LAYOUT (AUTHED ONLY)  */
/* ========================= */
function AppLayout() {
  const { logout } = useAuth();  

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-blue-700 text-white p-4 flex flex-col space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Luis Pool</h1>
          <p className="text-xs text-blue-100">Room & Booking Manager</p>
        </div>

        <nav className="flex flex-col space-y-2 text-sm">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/bookings" className={navLinkClass}>
            Bookings
          </NavLink>
          <NavLink to="/rooms" className={navLinkClass}>
            Rooms
          </NavLink>
          <NavLink to="/housekeeping" className={navLinkClass}>
            Housekeeping
          </NavLink>
          <NavLink to="/invoices" className={navLinkClass}>
            Invoices
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Settings
          </NavLink>
        </nav>

        <button
          onClick={logout}
          className="mt-auto px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto bg-slate-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/housekeeping" element={<Housekeeping />} />
          <Route path="/invoices" element={<InvoicesMain />} />
          <Route path="/invoices/new" element={<CreateInvoice />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

/* ========================= */
/* ROOT APP                  */
/* ========================= */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* PUBLIC */}
          <Route path="/login" element={<Login />} />

          {/* PROTECTED */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
