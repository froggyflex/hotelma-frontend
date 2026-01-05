import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckSquare,
  ListChecks,
  X,
  FileText,
  FileSpreadsheet
} from "lucide-react";

const API = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 15;

export default function BookingExports() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(1);

  /* LOAD BOOKINGS */
  useEffect(() => {
    axios.get(`${API}/bookings`).then(res => setBookings(res.data));
  }, []);

  /* FILTERING */
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      if (search && !b.guestName.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (fromDate && b.checkIn < fromDate) return false;
      if (toDate && b.checkOut > toDate) return false;
      return true;
    });
  }, [bookings, search, fromDate, toDate]);

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
  }, [search, fromDate, toDate, page]);

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
  const exportCSV = (bookingIds) => {
    if (!bookingIds.length) return;
    fetch(`${API}/api/exports/bookings/csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingIds })
    })
      .then(res => res.blob())
      .then(blob => download(blob, "bookings.csv"));
  };

  const exportPDF = (bookingIds) => {
    if (!bookingIds.length) return;
    fetch(`${API}/api/exports/bookings/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingIds })
    })
      .then(res => res.blob())
      .then(blob => download(blob, "bookings.pdf"));
  };

  const download = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">
          Booking Exports
        </h1>
        <p className="text-sm text-slate-500">
          Select and export bookings in CSV or PDF format.
        </p>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="border px-3 py-2 rounded text-sm"
            placeholder="Search guest"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="border px-3 py-2 rounded text-sm"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
          />
          <input
            type="date"
            className="border px-3 py-2 rounded text-sm"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* ACTION BAR */}
      <div className="sticky top-0 z-10 bg-white border-y shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm text-slate-600">
            {selectedIds.length
              ? `${selectedIds.length} selected`
              : `${filtered.length} bookings`}
          </span>

          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 border rounded-lg p-1 bg-slate-50">
              <button onClick={selectPage} className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white">
                <CheckSquare size={16} />
                <span className="hidden sm:inline">Page</span>
              </button>
              <button onClick={selectAllFiltered} className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white">
                <ListChecks size={16} />
                <span className="hidden sm:inline">All</span>
              </button>
              <button onClick={clearSelection} className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-white text-slate-500">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 border rounded-lg p-1 bg-slate-50">
              <button
                disabled={!selectedIds.length}
                onClick={() => exportCSV(selectedIds)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <FileSpreadsheet size={16} />
                <span className="hidden sm:inline">CSV</span>
              </button>
              <button
                disabled={!selectedIds.length}
                onClick={() => exportPDF(selectedIds)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
              >
                <FileText size={16} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
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
                        exportPDF([b.id]);
                      }}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
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
    </div>
  );
}
