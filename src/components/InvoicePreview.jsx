import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import "jspdf-autotable";
import QRCode from "qrcode";
import axios from "axios";
import autoTable from "jspdf-autotable";

const API = import.meta.env.VITE_API_URL;
const INVOICE_URL = `${API}/api/invoices`;
 

export default function InvoicePreview({ payload, booking,mark, close }) {
  if (!payload || !booking) return null;

  payload.bookingInfo = booking;
  const submit = () => {
    axios
      .post(`${INVOICE_URL}/submit`, payload)
      .then((res) => {
        const data = res.data || {};
        let aadeMark = null;
 
        if (data.mark) {
          aadeMark = data.mark; 
        }

        alert("Invoice submitted!\nMARK: " + (aadeMark || "N/A")); 
        close();
      })
      .catch((err) => {
        console.error("Submission error", err);
        alert(
          "Submission error: " +
            JSON.stringify(err.response?.data || err.message)
        );
      });
  };

const generatePDF = async () => {
  const doc = new jsPDF();

  const issuer = payload.issuer || {};
  const customer = payload.customer || {};
  const bookingInfo = payload.bookingInfo || booking;
  const accom = payload.invoiceDetails[0] || {};
  const taxLine = payload.invoiceDetails[1] || {};
  const markA = mark || "PENDING";

  // ---------- HEADER ----------
  doc.setFontSize(18);
  doc.text("INVOICE", 14, 18);

  // QR
  const qrData = `MARK:${markA}|AFM:${issuer.vatNumber}|DATE:${payload.invoiceHeader.issueDate}|AMOUNT:${payload.totalAmount.toFixed(2)}`;
  const qrImage = await QRCode.toDataURL(qrData);
  doc.addImage(qrImage, "PNG", 155, 10, 40, 40);

  // ---------- ISSUER DETAILS ----------
  doc.setFontSize(11);
  doc.text("Issuer:", 14, 32);
  doc.setFontSize(10);
  doc.text(issuer.name || "", 14, 38);
  if (issuer.address) doc.text(issuer.address, 14, 43);
  if (issuer.city) doc.text(`${issuer.city}`, 14, 48);
  if (issuer.postalCode) doc.text(`Postal Code: ${issuer.postalCode}`, 14, 53);
  if (issuer.country) doc.text(`${issuer.country}`, 14, 58);
  if (issuer.vatNumber) doc.text(`AFM: ${issuer.vatNumber}`, 14, 63);
  if (issuer.doy) doc.text(`DOY: ${issuer.doy}`, 14, 68);
  if (issuer.email) doc.text(`Email: ${issuer.email}`, 14, 73);
  if (issuer.phone) doc.text(`Phone: ${issuer.phone}`, 14, 78);

  // ---------- CUSTOMER ----------
  doc.setFontSize(11);
  doc.text("Customer:", 14, 92);
  doc.setFontSize(10);
  doc.text(customer.name || "-", 14, 98);
  if (customer.address) doc.text(customer.address, 14, 103);
  if (customer.city) doc.text(customer.city, 14, 108);
  if (customer.vatNumber) doc.text(`AFM: ${customer.vatNumber}`, 14, 113);
  if (customer.idDoc)
    doc.text(`ID/Passport: ${customer.idDoc}`, 14, 118);

  // ---------- INVOICE META ----------
  doc.setFontSize(11);
  doc.text("Invoice Details:", 110, 32);
  doc.setFontSize(10);
  doc.text(`Invoice Type: ${payload.invoiceHeader.invoiceType}`, 110, 38);
  doc.text(`Issue Date: ${payload.invoiceHeader.issueDate}`, 110, 43);
  doc.text(`AA (Number): ${payload.invoiceHeader.aa || "-"}`, 110, 48);
  doc.text(`MARK: ${markA}`, 110, 53);

  doc.text(`Room: ${bookingInfo.room}`, 110, 63);
  doc.text(`Check-in: ${bookingInfo.checkIn}`, 110, 68);
  doc.text(`Check-out: ${bookingInfo.checkOut}`, 110, 73);
  doc.text(`Nights: ${payload.nights}`, 110, 78);
  doc.text(`Channel: ${bookingInfo.channel || "-"}`, 110, 83);

  // ---------- TABLE ----------
  autoTable(doc, {
    startY: 130,
    head: [
      ["Description", "Qty", "Unit (€)", "Net (€)", "VAT (€)", "Total (€)"],
    ],
    body: [
      [
        accom.description,
        payload.nights,
        payload.rate.toFixed(2),
        accom.netValue.toFixed(2),
        accom.vatAmount.toFixed(2),
        (accom.netValue + accom.vatAmount).toFixed(2),
      ],
      [
        taxLine.description,
        payload.nights,
        taxLine.unitPrice.toFixed(2),
        taxLine.netValue.toFixed(2),
        "0.00",
        taxLine.netValue.toFixed(2),
      ],
    ],
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // ---------- TOTALS BOX ----------
  doc.setFontSize(11);
  doc.text("Totals:", 14, finalY);

  doc.setFontSize(10);
  doc.text(
    `Net Total: ${(accom.netValue + taxLine.netValue).toFixed(2)} €`,
    14,
    finalY + 6
  );
  doc.text(`VAT Total: ${accom.vatAmount.toFixed(2)} €`, 14, finalY + 12);
  doc.text(`Other Taxes: ${taxLine.netValue.toFixed(2)} €`, 14, finalY + 18);
  doc.text(`Total Amount: ${payload.totalAmount.toFixed(2)} €`, 14, finalY + 24);

  // ---------- FOOTER ----------
  doc.setFontSize(9);
  doc.text(
    `This invoice is electronically transmitted to AADE. MARK: ${markA}`,
    14,
    finalY + 35
  );

  doc.save(
    `invoice_${customer.name}_${payload.invoiceHeader.issueDate}.pdf`
  );
};


  const customer = payload.customer;
  const alreadySent = !!mark && mark !== "PENDING";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4">
        <h2 className="text-xl font-bold">Confirm Submission</h2>

        <div className="text-sm border rounded p-3 bg-slate-50">
          <p>
            <b>Customer:</b> {customer.name}
          </p>
          <p>
            <b>Total:</b> {payload.totalAmount.toFixed(2)} €
          </p>
          <p>
            <b>Invoice Type:</b>{" "}
            {payload.invoiceHeader.invoiceType === "1.1"
              ? "Business Invoice (B2B)"
              : "Retail Receipt (B2C)"}
          </p>
        </div>

        <div className="flex gap-4">
        {alreadySent ? (
          <div className="flex-1 bg-green-100 text-green-700 p-2 rounded shadow text-center border border-green-300">
            ✔ Already Submitted  
            <div className="text-xs text-green-600 mt-1">MARK: {mark}</div>
          </div>
        ) : (
          <button
            onClick={submit}
            className="flex-1 bg-green-600 text-white p-2 rounded shadow hover:bg-green-700"
          >
            ✔ Submit to AADE
          </button>
        )}

          <button
            onClick={generatePDF}
            className="flex-1 bg-blue-500 text-white p-2 rounded shadow hover:bg-blue-600"
          >
            🧾 PDF
          </button>

          <button
            onClick={close}
            className="flex-1 bg-gray-300 p-2 rounded hover:bg-gray-400"
          >
            ✖ Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
