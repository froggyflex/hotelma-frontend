import jsPDF from "jspdf";
import { useState } from "react";
import { WorkspaceDialog } from "./Workspace";
import { formatMoney } from "../utils/operations";
import "jspdf-autotable";
import QRCode from "qrcode";
import axios from "axios";
import autoTable from "jspdf-autotable";

const API = import.meta.env.VITE_API_URL;
const INVOICE_URL = `${API}/api/invoices`;
 

export default function InvoicePreview({ payload, booking, mark, close, onSubmitted, history = false }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const currentMark = sent?.mark || (mark === "PENDING" || mark === "-" ? null : mark);
  const header = payload?.invoiceHeader || {};
  const customer = payload?.customer || {};
  const lines = Array.isArray(payload?.invoiceDetails) ? payload.invoiceDetails : [];
  const canDownload = Boolean(header.issueDate && lines.length >= 2 &&
    payload?.totalAmount != null && Number.isFinite(Number(payload.totalAmount)));

  async function submit() {
    if (submitting || currentMark || history) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await axios.post(INVOICE_URL + "/submit", { ...payload, bookingInfo: booking });
      if (!data.success || !data.mark) throw new Error("No MARK returned");
      setSent(data);
    } catch (failure) {
      const response = failure.response?.data;
      const errors = Array.isArray(response?.errors) ? response.errors : [];
      setError(errors.map((entry) => entry?.message).filter(Boolean).join(" ") ||
        "AADE submission could not be confirmed. Check the invoice register before trying again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function generatePDF() {
    const doc = new jsPDF();

    const issuer = payload.issuer || {};

    const bookingInfo = payload.bookingInfo || booking;
    const accom = payload.invoiceDetails[0] || {};
    const taxLine = payload.invoiceDetails[1] || {};
    const markA = currentMark || "PENDING";

    // ---------- HEADER ----------
    doc.setFontSize(18);
    doc.text("INVOICE", 14, 18);

    // QR
    const qrData = `MARK:${markA}|AFM:${issuer.vatNumber}|DATE:${payload.invoiceHeader.issueDate}|AMOUNT:${Number(payload.totalAmount || 0).toFixed(2)}`;
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
    doc.text(`AA (Number): ${sent?.aa || header.aa || "-"}`, 110, 48);
    doc.text(`MARK: ${markA}`, 110, 53);

    doc.text(`Room: ${bookingInfo.room || "-"}`, 110, 63);
    doc.text(`Check-in: ${bookingInfo.checkIn || "-"}`, 110, 68);
    doc.text(`Check-out: ${bookingInfo.checkOut || "-"}`, 110, 73);
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
          accom.description || "Accommodation",
          payload.nights,
          Number(payload.rate || 0).toFixed(2),
          Number(accom.netValue || 0).toFixed(2),
          Number(accom.vatAmount || 0).toFixed(2),
          (Number(accom.netValue || 0) + Number(accom.vatAmount || 0)).toFixed(2),
        ],
        [
          taxLine.description || "Accommodation tax",
          payload.nights,
          Number(taxLine.unitPrice || 0).toFixed(2),
          Number(taxLine.netValue || 0).toFixed(2),
          "0.00",
          Number(taxLine.netValue || 0).toFixed(2),
        ],
      ],
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // ---------- TOTALS BOX ----------
    doc.setFontSize(11);
    doc.text("Totals:", 14, finalY);

    doc.setFontSize(10);
    doc.text(
      `Net Total: ${(Number(accom.netValue || 0) + Number(taxLine.netValue || 0)).toFixed(2)} €`,
      14,
      finalY + 6
    );
    doc.text(`VAT Total: ${Number(accom.vatAmount || 0).toFixed(2)} €`, 14, finalY + 12);
    doc.text(`Other Taxes: ${Number(taxLine.netValue || 0).toFixed(2)} €`, 14, finalY + 18);
    doc.text(`Total Amount: ${Number(payload.totalAmount || 0).toFixed(2)} €`, 14, finalY + 24);

    // ---------- FOOTER ----------
    doc.setFontSize(9);
    doc.text(
      currentMark ? `Submitted to AADE. MARK: ${markA}` : "Draft invoice. Pending submission to AADE.",
      14,
      finalY + 35
    );

    doc.save(
      `invoice_${customer.name}_${payload.invoiceHeader.issueDate}.pdf`
    );
  }

  async function download() {
    try {
      await generatePDF();
    } catch {
      setError("Could not create the PDF for this invoice.");
    }
  }

  function handleClose() {
    if (submitting) return;
    if (sent && onSubmitted) onSubmitted();
    else close();
  }

  return (
    <WorkspaceDialog title={history ? "Invoice details" : "Review invoice"} onClose={handleClose}>
      <div className="workspace-dialog-body space-y-4">
        <div className="workspace-form-grid text-sm">
          <div><p className="workspace-muted">Customer</p><strong>{customer.name || booking?.guestName || "—"}</strong></div>
          <div><p className="workspace-muted">Total</p><strong>{payload.totalAmount == null ? "—" : formatMoney(payload.totalAmount)}</strong></div>
          <div><p className="workspace-muted">Invoice type</p><strong>{header.invoiceType === "1.1" ? "Business (B2B)" : header.invoiceType === "11.3" ? "Touristic (B2C)" : header.invoiceType || "—"}</strong></div>
          <div><p className="workspace-muted">Issue date</p><strong>{header.issueDate || "—"}</strong></div>
          {(sent?.aa || header.aa) ? <div><p className="workspace-muted">Invoice number</p><strong>{sent?.series || header.series} / {sent?.aa || header.aa}</strong></div> : null}
          {currentMark && <div><p className="workspace-muted">AADE MARK</p><strong className="break-all">{currentMark}</strong></div>}
        </div>
        {lines.length > 0 && <div className="workspace-panel">
          {lines.map((line, index) => <div className="workspace-row text-sm" key={line.lineNumber ?? index}>
            <span>{line.description || "Invoice line"}</span><span>{formatMoney(line.netValue)} net · {formatMoney(line.vatAmount)} VAT</span>
          </div>)}
        </div>}
        {currentMark && <p className="workspace-badge workspace-badge-ready" role="status">Submitted to AADE</p>}
        {error && <p className="workspace-alert" role="alert">{error}</p>}
      </div>
      <div className="workspace-dialog-footer">
        <button className="workspace-button" disabled={submitting} onClick={handleClose}>Close</button>
        {canDownload && <button className="workspace-button" disabled={submitting} onClick={download}>Download PDF</button>}
        {!history && !currentMark && <button className="workspace-button workspace-primary" disabled={submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit to AADE"}</button>}
      </div>
    </WorkspaceDialog>
  );
}
