import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import React, { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Rooms from "./pages/Rooms";
import Calendar from "./pages/Calendar";
import Housekeeping from "./pages/Housekeeping";
import InvoicesMain from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";

import HubPage from "./hub/HubPage";

// Kitchen Admin
import KitchenAdminLayout from "./kitchenAdmin/layout/KitchenAdminLayout";
import ProductsPage from "./kitchenAdmin/pages/ProductsPage";
import NotesPage from "./kitchenAdmin/pages/NotesPage";
import TablesPage from "./kitchenAdmin/pages/TablesPage";
import KitchenLayout from "./kitchen/layout/KitchenLayout";
import OrderPage from "./kitchen/pages/OrderPage";
import AdminTableMapEditor from "./kitchenAdmin/pages/AdminTableMapEditor";

import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

const navLinkClass = ({ isActive }) =>
  "px-3 py-2 rounded-md text-sm font-medium " +
  (isActive ? "bg-white text-blue-700" : "hover:bg-blue-500/30");

/* ========================= */
/* APP LAYOUT (PMS)          */
/* ========================= */

function AppLayout() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed lg:static z-50
          inset-y-0 left-0
          w-64 bg-blue-700 text-white p-4
          flex flex-col space-y-4
          transform transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div>
          <h1 className="text-2xl font-bold">Luis Pool</h1>
          <p className="text-xs text-blue-100">Room & Booking Manager</p>
        </div>

        <nav className="flex flex-col space-y-2 text-sm">
          <NavLink to="/" end className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/bookings" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            Bookings
          </NavLink>
          <NavLink to="/rooms" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            Rooms
          </NavLink>
          <NavLink to="/housekeeping" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            Housekeeping
          </NavLink>
          <NavLink to="/invoices" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            AADE
          </NavLink>
          <NavLink to="/settings" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            Settings
          </NavLink>


        </nav>

        <button
          onClick={logout}
          className="mt-auto px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm"
        >
          Logout
        </button>
            <br></br> <br></br>
        {/* HUB LINK */}
          <NavLink to="/hub" className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            Switch App
          </NavLink>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* MOBILE HEADER */}
        <header className="lg:hidden flex items-center gap-3 bg-white border-b px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-blue-700 text-xl"
          >
            ☰
          </button>
          <span className="font-semibold text-slate-800">Dashboard</span>
        </header>

        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
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
            {/* HUB */}
            <Route path="/hub" element={<HubPage />} />
            <Route path="/kitchen" element={<KitchenLayout />}>
              <Route index element={<OrderPage />} />
            </Route>
            {/* PMS */}
            <Route path="/*" element={<AppLayout />} />

            {/* KITCHEN ADMIN */}
            <Route path="/kitchen-admin" element={<KitchenAdminLayout />}>
              <Route index element={<ProductsPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="tables" element={<TablesPage />} />
              <Route path="/kitchen-admin/table-map" element={<AdminTableMapEditor />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
