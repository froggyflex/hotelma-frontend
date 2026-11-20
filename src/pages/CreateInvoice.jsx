import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ChevronDown, Search } from "lucide-react";
import InvoicePreview from "../components/InvoicePreview";
import InvoiceFullDetails from "../components/InvoiceFullDetails";
import { DataFeedback, useWorkspaceData } from "../components/Workspace";
import buildInvoicePayload from "../utils/invoicePayloadBuilder";
import { API, formatMoney, isActiveBooking } from "../utils/operations";

const defaults = {
  customerType: "B2C", customerName: null, customerVatNumber: "", customerIdDoc: "",
  customerAddress: "", customerCountry: "GR", customerPostalCode: "", notes: "",
};

async function loadInvoiceInputs(signal) {
  const [bookings, settings] = await Promise.all([
    axios.get(API + "/bookings", { signal }),
    axios.get(API + "/api/settings", { signal }),
  ]);
  if (!Array.isArray(bookings.data) || !settings.data?.invoiceDefaults || !settings.data?.hotelInfo) throw new Error("Invalid invoice data");
  return { bookings: bookings.data.filter(isActiveBooking), settings: settings.data };
}

export default function CreateInvoice() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const resource = useWorkspaceData(loadInvoiceInputs);
  const { data, loading, error } = resource;
  const [bookingId, setBookingId] = useState(params.get("booking") || "");
  const [search, setSearch] = useState("");
  const [picker, setPicker] = useState(false);
  const [customer, setCustomer] = useState(defaults);
  const [payments, setPayments] = useState({});
  const [rate, setRate] = useState("");
  const [preview, setPreview] = useState(false);

  const bookings = data?.bookings || [];
  const booking = bookings.find((entry) => String(entry.id) === bookingId);
  const sourceRate = rate !== "" ? Number(rate) : Number(booking?.price || 0);
  const customerName = customer.customerName ?? booking?.guestName ?? "";
  const payload = booking ? buildInvoicePayload(booking, payments, data.settings, { ...customer, customerName, customRate: sourceRate }) : null;
  const validTotal = payload && Number.isFinite(payload.totalAmount) && payload.totalAmount >= 0 && sourceRate >= 0;
  const assigned = Object.values(payments).reduce((sum, value) => sum + Number(value || 0), 0);
  const wrongPayment = Object.values(payments).some((value) => Number(value) < 0);
  const paymentMismatch = validTotal && (wrongPayment || ((assigned > 0 || customer.customerType === "B2B") && Math.round(assigned * 100) !== Math.round(payload.totalAmount * 100)));
  const missingVat = customer.customerType === "B2B" && !customer.customerVatNumber.trim();
  const matching = bookings.filter((entry) => [entry.guestName, entry.room, entry.checkIn, entry.checkOut].some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())));

  function choose(entry) {
    setBookingId(String(entry.id));
    setPicker(false);
    setSearch("");
    setCustomer(defaults);
    setPayments({});
    setRate("");
  }

  function customerField(key, label, fallback = "") {
    return <label className="workspace-field">{label}
      <input className="workspace-input" value={customer[key] ?? fallback} onChange={(event) => setCustomer((current) => ({ ...current, [key]: event.target.value }))} />
    </label>;
  }

  return <div className="workspace">
    <header className="workspace-heading"><h1>New invoice</h1><Link className="workspace-button" to="/invoices">Invoice register</Link></header>
    {(!data || loading || error) && <DataFeedback {...resource} />}
    {data && <>
      <section className="workspace-panel">
        <div className="workspace-panel-header"><h2>Booking</h2></div>
        <div className="workspace-panel-body space-y-3">
          {bookingId && !booking && <p className="workspace-alert" role="alert">This booking is unavailable for invoicing. Choose another booking.</p>}
          <button className="workspace-button" aria-expanded={picker} onClick={() => setPicker((open) => !open)}>{booking ? booking.guestName + " · Room " + booking.room : "Select booking"} <ChevronDown size={16} /></button>
          {picker && <div className="workspace-panel">
            <div className="workspace-toolbar"><label className="booking-search"><Search size={17} aria-hidden="true" /><input autoFocus className="workspace-input" aria-label="Search bookings" placeholder="Search guest, room or date" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
            <div className="max-h-60 overflow-auto">
              {matching.length === 0 && <p className="workspace-empty">No bookings match this search.</p>}
              {matching.map((entry) => <button key={entry.id} type="button" className="workspace-row booking-list-row" onClick={() => choose(entry)}><strong>{entry.guestName}</strong><span className="workspace-muted">Room {entry.room} · {entry.checkIn} – {entry.checkOut}</span></button>)}
            </div>
          </div>}
          {booking && <label className="workspace-field max-w-xs">Price per night (€)
            <input className="workspace-input" type="number" min="0" step="0.01" value={rate || booking.price || 0} onChange={(event) => setRate(event.target.value)} />
          </label>}
        </div>
      </section>

      {booking && <>
        <section className="workspace-panel">
          <div className="workspace-panel-header"><h2>Customer and invoice type</h2></div>
          <div className="workspace-panel-body space-y-4">
            <label className="workspace-field max-w-xs">Invoice type
              <select className="workspace-input" value={customer.customerType} onChange={(event) => setCustomer({ ...customer, customerType: event.target.value })}>
                <option value="B2C">Touristic (B2C)</option><option value="B2B">Business (B2B)</option>
              </select>
            </label>
            <div className="workspace-form-grid">
              {customerField("customerName", "Customer name", booking.guestName)}
              {customer.customerType === "B2B" ? customerField("customerVatNumber", "VAT number (AFM)") : customerField("customerIdDoc", "ID / Passport")}
              {customerField("customerAddress", "Address")}
              {customerField("customerPostalCode", "Postal code")}
              {customerField("customerCountry", "Country ISO code")}
            </div>
            <label className="workspace-field">Internal notes
              <textarea className="workspace-input min-h-[70px]" value={customer.notes} onChange={(event) => setCustomer({ ...customer, notes: event.target.value })} />
            </label>
          </div>
        </section>
        <section className="workspace-panel">
          <div className="workspace-panel-header"><h2>Payments</h2>{validTotal && <span className="workspace-badge">Total {formatMoney(payload.totalAmount)}</span>}</div>
          <div className="workspace-panel-body space-y-3">
            <div className="workspace-form-grid">
              {[["cash", "Cash"], ["card", "Card"], ["bank", "Bank transfer"], ["iris", "IRIS"]].map(([key, label]) =>
                <label className="workspace-field" key={key}>{label} (€)
                  <input className="workspace-input" type="number" min="0" step="0.01" placeholder="0.00" value={payments[key] ?? ""} onChange={(event) => setPayments({ ...payments, [key]: event.target.value })} />
                </label>)}
            </div>
            <p className="workspace-muted">Payments entered · {formatMoney(assigned)}</p>
            {paymentMismatch && <p className="workspace-field-error" role="status">{wrongPayment ? "Enter non-negative payment amounts." : "Payment amounts must add up to the invoice total."}</p>}
          </div>
        </section>
        {validTotal && <InvoiceFullDetails payload={payload} booking={booking} />}
        <div className="workspace-actions justify-end">
          {missingVat && <span className="workspace-field-error">Enter the VAT number for a business invoice.</span>}
          <button className="workspace-button workspace-primary" disabled={!validTotal || !customerName.trim() || paymentMismatch || missingVat || loading || Boolean(error)} onClick={() => setPreview(true)}>Review invoice</button>
        </div>
      </>}
    </>}
    {preview && payload && booking && <InvoicePreview payload={payload} booking={booking} close={() => setPreview(false)} onSubmitted={() => navigate("/invoices")} />}
  </div>;
}

