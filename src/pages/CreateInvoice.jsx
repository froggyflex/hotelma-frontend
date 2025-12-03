import { useEffect, useState } from "react";
import axios from "axios";
import InvoicePreview from "../components/InvoicePreview";
import buildInvoicePayload from "../utils/invoicePayloadBuilder";
import InvoiceFullDetails from "../components/InvoiceFullDetails";

const API = import.meta.env.VITE_API_URL;
const BOOKINGS_URL = `${API}/bookings`;
const SETTINGS_URL = `${API}/api/settings`;

export default function CreateInvoice() {

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingDropdownOpen, setBookingDropdownOpen] = useState(false);


  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState(null);

  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Customer
  const [customerType, setCustomerType] = useState("B2C");
  const [customerName, setCustomerName] = useState("");
  const [customerVatNumber, setCustomerVatNumber] = useState("");
  const [customerIdDoc, setCustomerIdDoc] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCountry, setCustomerCountry] = useState("GR");
  const [customerPostalCode, setCustomerPostalCode] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Payments
  const [paymentCash, setPaymentCash] = useState(0);
  const [paymentCard, setPaymentCard] = useState(0);
  const [paymentBank, setPaymentBank] = useState(0);
  const [paymentIris, setPaymentIris] = useState(0);

  // Rate override
  const [customRate, setCustomRate] = useState(null);

  // Payload + modal
  const [payload, setPayload] = useState(null);
  const [showPreview, setShowPreview] = useState(false);


  const filteredBookings = bookings.filter(b => {
  const s = bookingSearch.toLowerCase();
    return (
      b.guestName.toLowerCase().includes(s) ||
      b.room.toLowerCase().includes(s) ||
      b.checkIn.includes(s) ||
      b.checkOut.includes(s)
    );
  });

  // Load settings + bookings
  useEffect(() => {
    axios.get(BOOKINGS_URL).then((res) => setBookings(res.data));
    axios.get(SETTINGS_URL).then((res) => setSettings(res.data));
  }, []);

  // When booking is selected, prefill
  useEffect(() => {
    const b = bookings.find((x) => x.id === selectedBookingId) || null;
    setSelectedBooking(b);

    if (b) {
      setCustomerName(b.guestName || b.name || "");
      setPaymentCash(0);
      setPaymentCard(0);
      setPaymentBank(0);
      setPaymentIris(0);
      setInvoiceNotes("");
      setCustomRate(b.price || null);
    }

    setPayload(null);
    setShowPreview(false);
  }, [selectedBookingId, bookings]);

  //LIVE PAYLOAD GENERATION — reacts to all changes
  useEffect(() => {
    if (!selectedBooking || !settings) return;

    const p = buildInvoicePayload(
      selectedBooking,
      {
        cash: paymentCash,
        card: paymentCard,
        bank: paymentBank,
        iris: paymentIris,
      },
      settings,
      {
        customerType,
        customerName,
        customerVatNumber,
        customerIdDoc,
        customerAddress,
        customerCountry,
        customerPostalCode,
        notes: invoiceNotes,
        customRate: customRate ?? null,
      }
    );

    setPayload(p);
  }, 
  [
    selectedBooking,
    settings,

    customerType,
    customerName,
    customerVatNumber,
    customerIdDoc,
    customerAddress,
    customerCountry,
    customerPostalCode,
    invoiceNotes,

    paymentCash,
    paymentCard,
    paymentBank,
    paymentIris,

    customRate,
  ]);

  const openPreview = () => {
    if (!payload) {
      alert("Payload is not ready yet.");
      return;
    }
    setShowPreview(true);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl mb-2 font-bold text-blue-600">
        Create Invoice
      </h1>

      {/* Booking selection */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <h2 className="text-lg font-semibold">1. Select Booking</h2>

        <div className="relative">
          <button
            type="button"
            onClick={() => setBookingDropdownOpen((o) => !o)}
            className="w-full border p-2 rounded bg-white flex justify-between"
          >
            {selectedBooking
              ? `${selectedBooking.guestName} — Room ${selectedBooking.room}`
              : "Select Booking..."}
            <span>▾</span>
          </button>

          {bookingDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-80 overflow-y-auto">
              
              {/* SEARCH FIELD */}
              <div className="p-2 sticky top-0 bg-white border-b">
                <input
                  type="text"
                  placeholder="Search bookings..."
                  className="w-full p-2 border rounded"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
              </div>

              {/* RESULT LIST */}
              {filteredBookings.length === 0 && (
                <div className="p-3 text-slate-500 text-center">
                  No bookings found
                </div>
              )}

              {filteredBookings.map((b) => (
                <button
                  key={b.id}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50"
                  onClick={() => {
                    setSelectedBooking(b);
                    setBookingDropdownOpen(false);
                    setBookingSearch("");
                    setSelectedBooking(b);
                    setPayload((prev) => ({
                      ...prev,
                      bookingInfo: b
                    })); // your logic
                  }}
                >
                  <div className="font-semibold">{b.guestName}</div>
                  <div className="text-xs text-slate-500">
                    Room {b.room} • {b.checkIn} → {b.checkOut}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>


        {selectedBooking && (
          <>
            <p className="text-xs text-slate-500 mt-1">
              Nights:{" "}
              {Math.max(
                1,
                Math.ceil(
                  (new Date(selectedBooking.checkOut) -
                    new Date(selectedBooking.checkIn)) /
                    (1000 * 60 * 60 * 24)
                )
              )}
            </p>

            <label className="flex flex-col mt-3 text-sm">
              <span className="text-xs text-slate-500 mb-0.5">
                Price per night (€)
              </span>
              <input
                type="number"
                className="border rounded px-2 py-1"
                value={customRate ?? ""}
                onChange={(e) =>
                  setCustomRate(Number(e.target.value || 0))
                }
              />
            </label>
          </>
        )}
      </div>

      {/* Customer info */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">2. Customer & Invoice Type</h2>

        <div className="flex gap-4 mb-3">
          <button
            type="button"
            onClick={() => setCustomerType("B2C")}
            className={
              "px-3 py-1 rounded border text-sm " +
              (customerType === "B2C"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-300")
            }
          >
            Touristic (B2C)
          </button>
          <button
            type="button"
            onClick={() => setCustomerType("B2B")}
            className={
              "px-3 py-1 rounded border text-sm " +
              (customerType === "B2B"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-300")
            }
          >
            Business (B2B)
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {/* Name */}
          <label className="flex flex-col">
            <span className="text-xs text-slate-500 mb-0.5">Customer name</span>
            <input
              className="border rounded px-2 py-1"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </label>

          {/* B2B VAT */}
          {customerType === "B2B" && (
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-0.5">Customer AFM</span>
              <input
                className="border rounded px-2 py-1"
                value={customerVatNumber}
                onChange={(e) => setCustomerVatNumber(e.target.value)}
              />
            </label>
          )}

          {/* B2C ID */}
          {customerType === "B2C" && (
            <label className="flex flex-col">
              <span className="text-xs text-slate-500 mb-0.5">ID / Passport</span>
              <input
                className="border rounded px-2 py-1"
                value={customerIdDoc}
                onChange={(e) => setCustomerIdDoc(e.target.value)}
              />
            </label>
          )}

          {/* Address */}
          <label className="flex flex-col md:col-span-2">
            <span className="text-xs text-slate-500 mb-0.5">Address</span>
            <input
              className="border rounded px-2 py-1"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-slate-500 mb-0.5">Postal Code</span>
            <input
              className="border rounded px-2 py-1"
              value={customerPostalCode}
              onChange={(e) => setCustomerPostalCode(e.target.value)}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-slate-500 mb-0.5">Country ISO</span>
            <input
              className="border rounded px-2 py-1"
              value={customerCountry}
              onChange={(e) => setCustomerCountry(e.target.value)}
            />
          </label>

          <label className="flex flex-col md:col-span-2">
            <span className="text-xs text-slate-500 mb-0.5">
              Notes (not sent to AADE)
            </span>
            <textarea
              className="border rounded px-2 py-1 min-h-[60px]"
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white p-4 rounded-lg shadow space-y-3">
        <h2 className="text-lg font-semibold">3. Payments Breakdown</h2>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <label className="flex flex-col">
            <span className="text-xs">Cash (€)</span>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={paymentCash}
              onChange={(e) => setPaymentCash(Number(e.target.value || 0))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs">Card (€)</span>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={paymentCard}
              onChange={(e) => setPaymentCard(Number(e.target.value || 0))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs">Bank transfer (€)</span>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={paymentBank}
              onChange={(e) => setPaymentBank(Number(e.target.value || 0))}
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs">IRIS (€)</span>
            <input
              type="number"
              className="border rounded px-2 py-1"
              value={paymentIris}
              onChange={(e) => setPaymentIris(Number(e.target.value || 0))}
            />
          </label>
        </div>
      </div>

      {/* LIVE FULL INVOICE DETAILS */}
      {payload && selectedBooking && (
        <InvoiceFullDetails payload={payload} booking={selectedBooking} />
      )}

      {/* FINAL CONFIRM BUTTON */}
      <div>
        {selectedBooking && (
          <button
            onClick={openPreview}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow"
          >
            ▶ Confirm & Submit
          </button>
        )}
      </div>

      {showPreview && payload && selectedBooking && (
        <InvoicePreview
          payload={payload}
          booking={selectedBooking}
          close={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
