// frontend/src/utils/invoicePayloadBuilder.js

/**
 * booking: booking object selected
 * payments: { cash, card, bank }
 * settings: settings object from /api/settings
 * options: {
 *   customerType: "B2C" | "B2B",
 *   customerName,
 *   customerVatNumber,
 *   customerIdDoc,
 *   customerAddress,
 *   customerCountry,
 *   customerPostalCode,
 *   notes
 * }
 */
  
  function getGreekDate() {
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000); // convert UTC → Greece

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
export default function buildInvoicePayload(
  booking,
  payments = {},
  settings = {},
  options = {}
) {
  if (!booking) throw new Error("No booking provided");

  const checkIn = new Date(booking.checkIn || booking.checkin);
  const checkOut = new Date(booking.checkOut || booking.checkout);
   
  const nights = Math.max(
    1,
    Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
  );

// NEW LOGIC — use custom nightly rate if provided
const rate = options.customRate !== null && options.customRate !== undefined
  ? Number(options.customRate)
  : Number(booking.price);
 
  const totalAccommodation = nights * (rate);

  const invoiceDefaults = settings.invoiceDefaults || {};
  const hotelInfo = settings.hotelInfo || {};
 

  const vatAccommodation = Number(invoiceDefaults.vatAccommodation ?? 0.13); //  
  //console.log('vat', vatAccommodation)
  const accommodationTaxPerNight = Number(
    invoiceDefaults.accommodationTax ?? 2.0
  );

  // Split net/VAT for accommodation
  const netAccommodation = Number((totalAccommodation / (1 + vatAccommodation)).toFixed(2));
   
  const vatAmount = Number((totalAccommodation - netAccommodation).toFixed(2));

  // Accommodation tax: per night flat fee
  const accommodationTaxTotal = Number((nights * accommodationTaxPerNight).toFixed(2));

  // Total invoice amount
  const totalAmount = Number((totalAccommodation + accommodationTaxTotal).toFixed(2));

  // Payments sanitised
  const cash = Number(payments.cash || 0);
  const card = Number(payments.card || 0);
  const bank = Number(payments.bank || 0);
  const iris = Number(payments.iris || 0);

  const paymentMethods = [];
  if (cash) paymentMethods.push({ type: 3, amount: cash }); // Cash
  if (card) paymentMethods.push({ type: 5, amount: card }); // Card
  if (bank) paymentMethods.push({ type: 1, amount: bank }); // Bank transfer
  if (iris) paymentMethods.push({ type: 8, amount: iris });  

  const customerType = options.customerType || "B2C";

  const customer = {
    type: customerType, // for UI / internal logic
    name:
      options.customerName ||
      booking.guestName ||
      booking.name ||
      "Guest",
    vatNumber: customerType === "B2B" ? options.customerVatNumber || "" : "",
    idDoc: customerType === "B2C" ? options.customerIdDoc || "" : "",
    address: options.customerAddress || "",
    country: options.customerCountry || "GR",
    postalCode: options.customerPostalCode || "",
  };


  // AADE invoiceHeader – we let backend set aa & series, but we keep some info
  const invoiceHeader = {
    series: invoiceDefaults.series || "A",
    aa: 0, // backend will assign and persist
    issueDate: getGreekDate(),
    currency: "EUR",
    invoiceType: customerType === "B2B" ? "1.1" : "11.3", // typical: 1.1 = invoice, 11.3 = receipt (adjust if needed)
  };

  // Main accommodation line
  const accommodationLine = {
    lineNumber: 1,
    netValue: netAccommodation,
    vatCategory: 2, // will be interpreted using vatAccommodation
    vatAmount: vatAmount,
    description: `Accommodation: ${nights} nights × €${rate}/night`,
    quantity: nights,
    unitPrice: rate,
    incomeClassification: [
      {
        classificationType: 1,
        classificationCategory: "1.5", // Hotels & similar lodging
        amount: netAccommodation,
      },
    ],
  };

  // Accommodation tax as separate line (no VAT)
  const taxLine = {
    lineNumber: 2,
    netValue: accommodationTaxTotal,
    vatCategory: 7, // 0% VAT with exemption
    vatExemptionCategory: 27,
    vatAmount: 0,
    description: `Accommodation Tax (€${accommodationTaxPerNight}/night)`,
    quantity: nights,
    unitPrice: accommodationTaxPerNight,
    otherTaxes: [
        {
            type: 4,
            amount: accommodationTaxTotal
        }
    ],
    incomeClassification: [
      {
        classificationType: 1,
        classificationCategory: "1.95", // different income category – adjust if accountant says otherwise
        amount: accommodationTaxTotal,
      },
    ],
    vatExemptionCategory: 27, // example code for hotel residence tax – confirm with accountant
  };

  const invoiceSummary = {
    sumNetValue: Number((netAccommodation + accommodationTaxTotal).toFixed(2)),
    sumVatAmount: Number(vatAmount.toFixed(2)),
    sumOtherTaxesAmount: Number(accommodationTaxTotal.toFixed(2)),
    sumFeesAmount: 0,
    sumGrossValue: Number((totalAmount).toFixed(2)),
  };

  return {
    // For AADE XML builder
    issuer: {
      name: hotelInfo.name,
      vatNumber: hotelInfo.vatNumber,
      country: hotelInfo.country || "GR",
      address: hotelInfo.address,
      email: hotelInfo.email,
      phone: hotelInfo.phone,
    },
    customer,
    invoiceHeader,
    invoiceDetails: [accommodationLine, taxLine],
    invoiceSummary,
    paymentMethods,
    totalAmount,
    nights,
    rate,
    accommodationTaxTotal,
    notes: options.notes || "",
    bookingId: booking.id,
  };
}
