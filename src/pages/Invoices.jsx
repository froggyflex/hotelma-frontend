import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FileText, Plus, Search } from "lucide-react";
import InvoicePreview from "../components/InvoicePreview";
import { DataFeedback, useWorkspaceData } from "../components/Workspace";
import { API, formatMoney } from "../utils/operations";

const localDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Athens", year: "numeric", month: "2-digit", day: "2-digit" });
const displayDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Athens", dateStyle: "medium" });

async function loadInvoices(signal) {
  const { data } = await axios.get(API + "/api/invoices/list", { signal });
  if (!Array.isArray(data.invoices)) throw new Error("Invalid response");
  return data.invoices;
}

function invoiceDetails(invoice) {
  const payload = invoice.payload || {};
  const mark = invoice.mydataResponse?.invoiceMark || invoice.mark || payload.mydataResponse?.invoiceMark;
  const submitted = invoice.dateSubmitted || invoice.createdAt;
  const date = submitted && Number.isFinite(Date.parse(submitted)) ? new Date(submitted) : null;
  const booking = payload.bookingInfo;
  const customer = payload.customer?.name || invoice.customer?.name || booking?.guestName || "—";
  const number = [invoice.series || payload.invoiceHeader?.series, invoice.aa ?? payload.invoiceHeader?.aa].filter((part) => part != null && part !== "").join(" / ");
  const status = invoice.status === "error" ? "Failed" : mark || invoice.status === "submitted" ? "Submitted" : "Draft";
  return { ...invoice, payload, booking, mark, date, customer, number, status, total: payload.totalAmount ?? invoice.totalAmount };
}

export default function Invoices() {
  const resource = useWorkspaceData(loadInvoices);
  const { data, loading, error } = resource;
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState(null);
  const term = search.trim().toLowerCase();
  const invalidRange = from && to && from > to;
  const invoices = (data || []).map(invoiceDetails);
  const visible = invalidRange ? [] : invoices.filter((invoice) => {
    const date = invoice.date ? localDate.format(invoice.date) : "";
    if ((from || to) && !date) return false;
    if ((from && date < from) || (to && date > to)) return false;
    return !term || [invoice.customer, invoice.number, invoice.mark, invoice.status, invoice.booking?.room, date]
      .some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  return (
    <div className="workspace">
      <header className="workspace-heading">
        <h1>Invoices</h1>
        <Link className="workspace-button workspace-primary" to="/invoices/new"><Plus size={17} /> New invoice</Link>
      </header>
      {(!data || loading || error) && <DataFeedback {...resource} />}
      {data && <section className="workspace-panel">
        <div className="workspace-toolbar invoice-toolbar">
          <label className="booking-search"><Search size={17} aria-hidden="true" /><input className="workspace-input" aria-label="Search invoices" placeholder="Search customer, number or MARK" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="workspace-field">From date<input className="workspace-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label className="workspace-field">To date<input className="workspace-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          {(from || to || term) && <button className="workspace-button" onClick={() => { setFrom(""); setTo(""); setSearch(""); }}>Clear filters</button>}
        </div>
        {invalidRange && <p className="workspace-field-error px-4 pt-3" role="alert">To date must be on or after from date.</p>}
        <div className="workspace-panel-header"><h2>Invoice register</h2><span className="workspace-muted" role="status">{visible.length} of {invoices.length} invoices</span></div>
        {visible.length === 0 ? <p className="workspace-empty">{invoices.length ? "No invoices match these filters." : "No invoices have been recorded."}</p> :
          <div className="workspace-table-wrap">
            <table className="workspace-table invoice-table">
              <thead><tr><th scope="col">Customer</th><th scope="col">Invoice number</th><th scope="col">Date</th><th scope="col">Total</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{visible.map((invoice) => <tr key={invoice.id}>
                <td data-label="Customer"><strong>{invoice.customer}</strong>{invoice.booking?.room && <span className="workspace-muted block">Room {invoice.booking.room}</span>}</td>
                <td data-label="Invoice number">{invoice.number || "—"}</td>
                <td data-label="Date">{invoice.date ? displayDate.format(invoice.date) : "—"}</td>
                <td data-label="Total">{invoice.total == null ? "—" : formatMoney(invoice.total)}</td>
                <td data-label="Status"><span className={"workspace-badge" + (invoice.status === "Submitted" ? " workspace-badge-ready" : invoice.status === "Failed" ? " workspace-badge-danger" : "")}>{invoice.status}</span></td>
                <td><button className="workspace-button" onClick={() => setPreview(invoice)} aria-label={"View invoice for " + invoice.customer}><FileText size={17} /> View</button></td>
              </tr>)}</tbody>
            </table>
          </div>}
      </section>}
      {data && !loading && !error && <DataFeedback {...resource} />}
      {preview && <InvoicePreview payload={preview.payload} booking={preview.booking || { guestName: preview.customer }} mark={preview.mark} history close={() => setPreview(null)} />}
    </div>
  );
}
