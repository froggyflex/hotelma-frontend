import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";

import { ArrowLeftRight, BedDouble, CalendarDays, ClipboardList, FileDown, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, Waves } from "lucide-react";
import "./styles/workspace.css";
import "./styles/operations-workspace.css";

import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Rooms from "./pages/Rooms";
import Housekeeping from "./pages/Housekeeping";
import InvoicesMain from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import BookingExports from "./pages/Exports";

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

const navigation = [
  ["/", "Dashboard", LayoutDashboard],
  ["/bookings", "Bookings", CalendarDays],
  ["/rooms", "Rooms", BedDouble],
  ["/housekeeping", "Housekeeping", ClipboardList],
  ["/invoices", "Invoices", ReceiptText],
  ["/exports/bookings", "Booking exports", FileDown],
  ["/settings", "Settings", Settings],
];

function AppLayout() {
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const title = pathname === "/calendar" ? "Calendar" : pathname === "/invoices/new" ? "New invoice" :
    navigation.find(([path]) => pathname === path || pathname.startsWith(path + "/"))?.[1] || "Luis Pool";

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="pms-shell">
      {sidebarOpen && <button className="pms-nav-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}
      <aside id="pms-navigation" className={sidebarOpen ? "pms-nav pms-nav-open" : "pms-nav"} onKeyDown={(event) => {
        if (event.key === "Escape") setSidebarOpen(false);
      }}>
        <div className="pms-brand">
          <div className="pms-brand-mark"><Waves size={22} aria-hidden="true" /></div>
          <div><strong>Luis Pool &amp; Family</strong><small>Property management</small></div>
        </div>
        <nav aria-label="Property management">
          {navigation.map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end={path === "/"} className="pms-nav-link" onClick={() => setSidebarOpen(false)}>
              <Icon size={18} aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="pms-nav-footer">
          <NavLink to="/hub" className="pms-nav-link"><ArrowLeftRight size={18} aria-hidden="true" /> Switch app</NavLink>
          <button onClick={logout} className="pms-nav-link"><LogOut size={18} aria-hidden="true" /> Sign out</button>
        </div>
      </aside>
      <div className="pms-body">
        <header className="pms-mobile-header">
          <button className="workspace-icon" aria-label="Open menu" aria-controls="pms-navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen((open) => !open)}><Menu size={20} /></button>
          <span>{title}</span>
        </header>
        <main className="pms-main" key={pathname}>

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/calendar" element={<Navigate to="/bookings" replace />} />
            <Route path="/housekeeping" element={<Housekeeping />} />
            <Route path="/invoices" element={<InvoicesMain />} />
            <Route path="/invoices/new" element={<CreateInvoice />} />
            <Route path="/exports/bookings" element={<BookingExports />} />
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
