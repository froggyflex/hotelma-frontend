const BAR_CATEGORIES = new Set([
  "ICE CREAM",
  "COFFEES",
  "SWEETS",
  "SLUSH PUPPIES",
  "SOFT DRINKS",
  "LONG DRINKS",
  "BEERS",
  "JUICES",
  "WINES - OUZO",
  "OTHER",
]);

export function buildThermalPrint(
  { table, orderName, tableNote = null, items = [], createdAt },
  products = []
) {
  // ESC/POS BIG TEXT
  const BIG_ON  = "\x1D\x21\x11";
  const BIG_OFF = "\x1D\x21\x00";

  const line = "------------------------";
  const cutLine = "- - - - - CUT HERE - - - - -";

  const time = new Date(createdAt || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // =========================
  // SPLIT ITEMS
  // =========================
  const barItems = [];
  const kitchenItems = [];

  items.forEach(item => {
    const product = products.find(
      p => String(p._id) === String(item.productId)
    );

    const category = (
      product?.category ||
      item.category ||
      "OTHER"
    ).toUpperCase();

    if (BAR_CATEGORIES.has(category)) {
      barItems.push({ ...item, category });
    } else {
      kitchenItems.push({ ...item, category });
    }
  });

  const hasBar = barItems.length > 0;
  const hasKitchen = kitchenItems.length > 0;
  const multiSection = hasBar && hasKitchen;

  // =========================
  // HELPERS
  // =========================
  function printHeader(sectionName) {
    return [
      line,
      sectionName ? `*** ${sectionName} ***` : null,
      `TABLE: ${orderName || table?.name || "-"}`,
      tableNote ? `NOTE: ${tableNote}` : null,
      `TIME: ${time}`,
      line,
      ""
    ].filter(Boolean);
  }

  function printItems(items) {
    let out = [];
    items.forEach(item => {
      out.push(`${item.qty}x ${item.name}`);

      item.notes?.forEach(n => {
        out.push(`  - ${n}`);
      });

      if (item.customNote) {
        out.push(`  * ${item.customNote}`);
      }

      out.push("");
    });
    return out;
  }

  // =========================
  // BUILD OUTPUT
  // =========================
  let output = [];

  // 🔥 ENABLE BIG TEXT FOR EVERYTHING
  output.push(BIG_ON);

  // ----- BAR TICKET -----
  if (hasBar) {
    output.push(...printHeader(multiSection ? "BAR" : null));
    output.push(...printItems(barItems));
  }

  // ----- TEAR LINE (ONLY IF BOTH EXIST) -----
  if (multiSection) {
    output.push(line);
    output.push(cutLine);
    output.push(line);
    output.push("");
  }

  // ----- KITCHEN TICKET -----
  if (hasKitchen) {
    output.push(...printHeader(multiSection ? "KITCHEN" : null));
    output.push(...printItems(kitchenItems));
  }

  // =========================
  // FINAL FEED
  // =========================
  output.push(line);

  // 🔥 RESET TEXT SIZE
  output.push(BIG_OFF);

  return output.join("\n");
}
