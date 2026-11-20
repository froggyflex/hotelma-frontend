import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DataFeedback, useWorkspaceData } from "../components/Workspace";
import {
  CheckSquare,
  ListChecks,
  X,
  FileText,
  FileSpreadsheet
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 15;

async function loadBookings(signal) {
  const { data } = await axios.get(API + "/bookings", { signal });
  if (!Array.isArray(data)) throw new Error("Invalid response");
  return data;
}

export default function BookingExports() {
  const resource = useWorkspaceData(loadBookings);
  const { data, loading, error } = resource;
  const [exportError, setExportError] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);

  /* FILTERING */
  const filtered = useMemo(() => {
    return (data || []).filter(b => {
      if (search && !String(b.guestName || "").toLowerCase().includes(search.trim().toLowerCase()))
        return false;
      if (fromDate && b.checkIn < fromDate) return false;
      if (toDate && b.checkOut > toDate) return false;
      return true;
    });
  }, [data, search, fromDate, toDate]);

  /* PAGINATION */
  const paginated = useMemo(() => {
    return filtered.slice(
      (page - 1) * PAGE_SIZE,
      page * PAGE_SIZE
    );
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  /* RESET SELECTION ON PAGE/FILTER CHANGE */
  useEffect(() => {
    setSelectedIds([]);
  }, [data, search, fromDate, toDate, page]);

  useEffect(() => {
    setPage(1);
  }, [data, search, fromDate, toDate]);

  /* SELECTION */
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const selectPage = () => setSelectedIds(paginated.map(b => b.id));
  const selectAllFiltered = () => setSelectedIds(filtered.map(b => b.id));
  const clearSelection = () => setSelectedIds([]);

  const pageFullySelected =
    paginated.length > 0 &&
    paginated.every(b => selectedIds.includes(b.id));

  /* EXPORTS */
  async function exportBookings(bookingIds, format) {
    if (!bookingIds.length) return;
    setExportError("");
    try {
      const response = await axios.post(API + "/api/exports/bookings/" + format, { bookingIds }, { responseType: "blob" });
      download(response.data, "bookings." + format);
    } catch {
      setExportError("Could not export the selected bookings. Try again.");
    }
  }

  const download = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace">

      {/* HEADER */}
      <header className="workspace-heading"><h1>Booking exports</h1></header>
      <DataFeedback {...resource} />
      {exportError && <p className="workspace-alert" role="alert">{exportError}</p>}
      {data && <>

      {/* FILTERS */}
      <div className="workspace-panel workspace-panel-body">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="workspace-field">Guest name<input
            className="workspace-input"
            aria-label="Search guest"
            placeholder="Search guest"
            value={search}
            onChange={e => setSearch(e.target.value)}
          /></label>
          <label className="workspace-field">Earliest check-in<input
            type="date"
            className="workspace-input"
            aria-label="Earliest check-in"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          /></label>
          <label className="workspace-field">Latest check-out<input
            type="date"
            className="workspace-input"
            aria-label="Latest check-out"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          /></label>
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="workspace-panel sticky top-0 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm text-slate-600">
            {selectedIds.length
              ? `${selectedIds.length} selected`
              : `${filtered.length} bookings`}
          </span>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 border rounded-lg p-1 bg-slate-50">
              <button onClick={selectPage} className="workspace-button" aria-label="Select this page">
                <CheckSquare size={16} />
                <span className="hidden sm:inline">Page</span>
              </button>
              <button onClick={selectAllFiltered} className="workspace-button" aria-label="Select all matching bookings">
                <ListChecks size={16} />
                <span className="hidden sm:inline">All</span>
              </button>
              <button onClick={clearSelection} className="workspace-icon" aria-label="Clear selection">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 border rounded-lg p-1 bg-slate-50">
              <button
                disabled={!selectedIds.length}
                onClick={() => exportBookings(selectedIds, "csv")}
                className="workspace-button"
                aria-label="Export selected bookings as CSV"
              >
                <FileSpreadsheet size={16} />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                disabled={!selectedIds.length}
                onClick={() => exportBookings(selectedIds, "pdf")}
                className="workspace-button workspace-primary"
                aria-label="Export selected bookings as PDF"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="workspace-panel workspace-table-wrap">
        <table className="workspace-table">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  aria-label="Select bookings on this page"
                  checked={pageFullySelected}
                  onChange={e => e.target.checked ? selectPage() : clearSelection()}
                  className="w-5 h-5 accent-blue-600"
                />
              </th>
              <th className="px-3 py-2 text-left">Guest</th>
              <th className="px-3 py-2 hidden sm:table-cell">Check-in</th>
              <th className="px-3 py-2 hidden sm:table-cell">Check-out</th>
              <th className="px-3 py-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {!paginated.length && <tr><td colSpan={5} className="workspace-empty">No bookings match these filters.</td></tr>}
            {paginated.map(b => {
              const selected = selectedIds.includes(b.id);
              return (
                <tr
                  key={b.id}
                  className={`border-t ${selected ? "bg-blue-50" : "odd:bg-white even:bg-slate-50"}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={"Select " + b.guestName}
                      checked={selected}
                      onChange={e => {
                        e.stopPropagation();
                        toggleSelect(b.id);
                      }}
                      className="w-5 h-5 accent-blue-600"
                    />
                  </td>

                  <td className="px-3 py-3 font-medium">
                    {b.guestName}
                    {b.status === "no-show" && <span className="workspace-badge workspace-badge-warn ml-2">No-show</span>}
                    <div className="text-xs text-slate-500 sm:hidden">
                      {b.checkIn} – {b.checkOut}
                    </div>
                  </td>

                  <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-600">
                    {b.checkIn}
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-600">
                    {b.checkOut}
                  </td>

                  <td className="px-3 py-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        exportBookings([b.id], "pdf");
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                      aria-label={"Export PDF for " + b.guestName}
                    >
                      <FileText size={16} />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-slate-600">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
      </>}
    </div>
  );
}
