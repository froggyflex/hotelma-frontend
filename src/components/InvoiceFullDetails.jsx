import { useState } from "react";

export default function InvoiceFullDetails({ payload, booking }) {
    
  const [tab, setTab] = useState("summary");

  if (!payload) return null;

  const {
    invoiceHeader,
    issuer,
    customer,
    invoiceDetails,
    paymentMethods,
    totalAmount,
    nights,
    rate,
    accommodationTaxTotal,
  } = payload;
 
  const tabs = [
    { id: "summary", label: "Summary" },
    { id: "header", label: "AADE Header" },
    { id: "parties", label: "Customer & Issuer" },
    { id: "lines", label: "Lines & Payments" },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4 mt-6">
      
      <h2 className="text-lg font-bold text-blue-600">
        Invoice Details (Live Preview)
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-3 py-1 text-sm rounded-t border " +
              (tab === t.id
                ? "border-blue-600 border-b-white bg-blue-50 text-blue-700"
                : "border-slate-300 bg-slate-100 text-slate-600")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === SUMMARY TAB === */}
      {tab === "summary" && (
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold text-slate-700 mb-2 text-base">
            Booking Summary
          </h3>
          <p><b>Room:</b> {booking.room}</p>
          <p>
            <b>Check-in:</b> {booking.checkIn} — <b>Check-out:</b> {booking.checkOut}
          </p>
          <p><b>Nights:</b> {nights}</p>
          <p><b>Rate per night:</b> €{rate}</p>
          <p><b>Accommodation tax:</b> €{accommodationTaxTotal}</p>
          <p className="mt-2 text-lg font-bold text-blue-600">
            Total Amount: €{totalAmount?.toFixed(2)}
          </p>
        </div>
      )}

      {/* === AADE HEADER TAB === */}
      {tab === "header" && (
        <div className="space-y-1 text-sm">
          <h3 className="font-semibold text-slate-700 mb-2 text-base">
            Invoice Header
          </h3>

          <p><b>Invoice Type:</b> {invoiceHeader.invoiceType}</p>
          <p><b>Series:</b> {invoiceHeader.series}</p>
          <p><b>AA:</b> {invoiceHeader.aa} (assigned by backend)</p>
          <p><b>Issue Date:</b> {invoiceHeader.issueDate}</p>
          <p><b>Currency:</b> {invoiceHeader.currency}</p>
        </div>
      )}

      {/* === CUSTOMER & ISSUER TAB === */}
      {tab === "parties" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          
          {/* Issuer */}
          <div className="border rounded p-3 bg-slate-50">
            <h3 className="font-semibold">Issuer (Hotel)</h3>
            <p><b>Name:</b> {issuer?.name}</p>
            <p><b>AFM:</b> {issuer?.vatNumber}</p>
            <p><b>Address:</b> {issuer?.address}</p>
            <p><b>Country:</b> {issuer?.country}</p>
            <p><b>Phone:</b> {issuer?.phone}</p>
            <p><b>Email:</b> {issuer?.email}</p>
          </div>

          {/* Customer */}
          <div className="border rounded p-3 bg-slate-50">
            <h3 className="font-semibold">Customer</h3>
            <p><b>Name:</b> {customer.name}</p>
            <p><b>Type:</b> {customer.type}</p>

            {customer.type === "B2B" && (
              <p><b>VAT (AFM):</b> {customer.vatNumber}</p>
            )}

            {customer.type === "B2C" && (
              <p><b>ID/Passport:</b> {customer.idDoc}</p>
            )}

            <p><b>Address:</b> {customer.address}</p>
            <p><b>Postal Code:</b> {customer.postalCode}</p>
            <p><b>Country:</b> {customer.country}</p>
          </div>
        </div>
      )}

      {/* === LINES & PAYMENTS TAB === */}
      {tab === "lines" && (
        <div className="space-y-4 text-sm">

          <h3 className="font-semibold text-slate-700">Invoice Lines</h3>

          {invoiceDetails.map((line) => (
            <div
              key={line.lineNumber}
              className="border rounded p-3 bg-slate-50 space-y-1"
            >
              <p><b>Line #{line.lineNumber}</b></p>
              <p><b>Description:</b> {line.description}</p>
              <p><b>Quantity:</b> {line.quantity}</p>
              <p><b>Net:</b> €{line.netValue.toFixed(2)}</p>
              <p><b>VAT Category:</b> {line.vatCategory}</p>
              <p><b>VAT Amount:</b> €{line.vatAmount.toFixed(2)}</p>
              <p><b>Total:</b> €{(line.netValue + line.vatAmount).toFixed(2)}</p>

              <h4 className="font-semibold mt-2">Classification</h4>
              {line.incomeClassification?.map((c, idx) => (
                <p key={idx}>
                  • <b>{c.classificationCategory}</b> — {c.amount}
                </p>
              ))}

              {line.vatExemptionCategory && (
                <p className="mt-1">
                  <b>Exemption Category:</b> {line.vatExemptionCategory}
                </p>
              )}
            </div>
          ))}

          <h3 className="font-semibold text-slate-700 mt-4">Payments</h3>

          <div className="border rounded bg-slate-50 p-3">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((pm, idx) => (
                <p key={idx}>
                  • <b>Type {pm.type}</b>: €{pm.amount.toFixed(2)}
                </p>
              ))
            ) : (
              <p>No payments provided (AADE will reject B2B).</p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
