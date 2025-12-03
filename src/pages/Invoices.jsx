// frontend/src/pages/Invoices.jsx
import { useState, useEffect } from "react";
import axios from "axios";
import InvoicePreview from "../components/InvoicePreview";

const API = import.meta.env.VITE_API_URL;
const URL = `${API}/api/invoices`;

export default function InvoicesMain() {
  const [invoices, setInvoices] = useState([]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState(null); // {payload, booking}
  const [search, setSearch] = useState("");
  
  const [searchResults, setSearchResults] = useState([]);

  const load = () => {
    const params = {};
    if (filterFrom) params.from = filterFrom;
    if (filterTo) params.to = filterTo;

    axios
      .get(`${URL}/list`, { params })
      .then((res) => {
        setInvoices(res.data.invoices || []);
      })
      .catch((err) => {
        console.error("Invoice list error", err);
      });
  };

  useEffect(() => {
    load();
  }, []); // initial

  const applyFilter = () => {
    load();
  };
  
  const handleSearch = (text) => {
      setSearch(text);
      // console.log(invoices)
      if (!text.trim()) {
        setSearchResults([]);
        return;
      }

      const lower = text.toLowerCase();

      const results = invoices.filter((b) =>
        b.payload.bookingInfo.guestName.toLowerCase().includes(lower) ||
        b.payload.bookingInfo.room.toLowerCase().includes(lower) ||
        b.payload.bookingInfo.channel.toLowerCase().includes(lower) ||
        b.payload.bookingInfo.notes.toLowerCase().includes(lower) ||
        b.payload.bookingInfo.checkIn.includes(lower) ||
        b.payload.bookingInfo.checkOut.includes(lower) ||
        b.mark.includes(lower) ||
        b.dateSubmitted.includes(lower)  
      );

      setSearchResults(results);
  };
  const openPdfPreview = (inv, index) => {
     let hidden = document.getElementById(`k:${index}`);
     let mark = hidden?.value;
    if (!inv) {
      alert("This invoice has no stored payload/booking data.");
      return;
    }
    setPreviewInvoice({
      payload: inv,
      booking: inv.bookingInfo,
      mark:mark
       
    });


  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between mb-2">
        <h1 className="text-2xl font-bold text-blue-600">Invoices</h1>
        <a
          href="/invoices/new"
          className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-sm"
        >
          ➕ New Invoice
        </a>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 items-end text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-0.5">From date</span>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-0.5">To date</span>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          type="button"
          onClick={applyFilter}
          className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm"
        >
          Filter
        </button>
      </div>
      <input
        type="text"
        placeholder="Search invoices..."
        className="border p-2 rounded w-full mb-3"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
      />
      {/* Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">AA / MARK</th>
              <th>Type</th>
              <th>Customer</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Nights × Rate</th>
              <th>VAT / Tax</th>
              <th>Total (€)</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td className="py-4 text-center text-slate-400" colSpan={8}>
                  No invoices yet.
                </td>
              </tr>
            )}
            {invoices.map((inv, i) => {
              const payload = inv.payload || {};
              
              const details = payload.invoiceDetails || [];
              const accom = details[0] || {};
              const taxLine = details[1] || {};
              const customer = payload.customer || inv.customer.name || {};

              const room =  payload.bookingInfo? payload.bookingInfo.room : "";  
              const checkIn =  payload.bookingInfo? payload.bookingInfo.checkIn : "";  
              const checkOut =   payload.bookingInfo?  payload.bookingInfo.checkOut : "";  

              const nights = payload.nights || inv.nights;
              const rate = payload.rate || inv.rate;
              const total =
                payload.totalAmount ?? inv.totalAmount ?? 0;

              const typeLabel =
                payload.invoiceHeader?.invoiceType === "1.1"
                  ? "Business (1.1)"
                  : payload.invoiceHeader?.invoiceType === "11.3"
                  ? "Touristic (11.3)"
                  : payload.invoiceHeader?.invoiceType || "-";

              const mark =
                inv.mydataResponse?.invoiceMark ||
                inv.mark ||
                payload.mydataResponse?.invoiceMark ||
                "-";
             
              const submittedAt = inv.dateSubmitted || inv.createdAt;

              return (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="py-2 text-xs">
                    <div>AA: {inv.aa || payload.invoiceHeader?.aa || "-"}</div>
                    <div>MARK: {mark}</div>
                    <input type="hidden" id={'k:'+i} value={mark} ></input>
                  </td>
                  <td className="text-xs">{typeLabel}</td>
                  <td className="text-xs">
                    {customer.name || "—"}
                    {customer.vatNumber && (
                      <div className="text-[10px] text-slate-500">
                        AFM: {customer.vatNumber}
                      </div>
                    )}
                    {customer.idDoc && (
                      <div className="text-[10px] text-slate-500">
                        ID/Passport: {customer.idDoc}
                      </div>
                    )}
                  </td>
                  <td className="text-xs"> {room} </td>
                  <td className="text-xs"> {checkIn}</td>
                  <td className="text-xs"> {checkOut} </td>
                    
                  <td className="text-xs">
                    {nights} × {rate?.toFixed ? rate.toFixed(2) : rate} €
                  </td>
                  <td className="text-xs">
                    VAT:{" "}
                    {accom.vatAmount
                      ? accom.vatAmount.toFixed(2)
                      : "0.00"}{" "}
                    €{" "}
                    {taxLine.netValue && (
                      <>
                        <br />
                        Acc. Tax: {taxLine.netValue.toFixed(2)} €
                      </>
                    )}
                  </td>
                  <td className="text-xs font-semibold">
                    {total.toFixed ? total.toFixed(2) : total} €
                  </td>
                  <td className="text-xs">
                    {submittedAt
                      ? new Date(submittedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="text-right">
                    <button
                      data-index={i} 
                      type="button"
                      onClick={(e) => openPdfPreview(payload, e.currentTarget.dataset.index)}
                      className="px-2 py-1 text-xs bg-slate-100 rounded hover:bg-slate-200"
                    >
                      🧾 PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

        {/* Results Dropdown */}
        {searchResults.length > 0 && (

          
          <div style={{margin: '0 auto',width:'50%',top:'50'}} className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-64 overflow-y-auto z-50">
            {searchResults.map((b, i) => (
              <button
                data-index={i} 
                key={b.id}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b"
                onClick={(e) => {
                  setSearch("");
                  setSearchResults([]);
                  setPreviewInvoice({
                    payload: b.payload,
                    booking: b.payload.bookingInfo,
                    mark: b.mark
                  });
                  
                }}
              >
                <div className="font-semibold">{b.guestName}</div>
                <div className="text-xs text-slate-500">
                  Invoice {b.mark} • {b.payload.bookingInfo.guestName}   
                </div>
              </button>
            ))}
          </div>
        )}
              {previewInvoice && (
        <InvoicePreview
          payload={previewInvoice.payload}
          booking={previewInvoice.booking}
          mark={previewInvoice.mark}
          close={() => setPreviewInvoice(null)}
        />
      )}
    </div>
  );
}
