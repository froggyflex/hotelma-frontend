

export function buildThermalPrint(
  { table, orderName, tableNote = null, items = [], createdAt },
  products = []
) {
  const BIG_ON  = "\x1D\x21\x11";
  const BIG_OFF = "\x1D\x21\x00";

  const line = "--------------------------------";

  const time = new Date(createdAt || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // 🔹 Group items by CATEGORY (from products)
  const grouped = items.reduce((acc, item) => {
    const product = products.find(p => p._id === item.productId);

    const category = (
      product?.category ||
      item.category ||        // fallback if stored on item
      "Other"
    ).toUpperCase();

    if (!acc[category]) acc[category] = [];
    acc[category].push(item);

    return acc;
  }, {});

  let output = [];
  output.push(BIG_ON);
  output.push(line);

  // ✅ REAL TABLE NAME
  output.push(`TABLE: ${orderName || table?.name}`);

  // ✅ TABLE NICKNAME / ORDER NAME
  // if (orderName) {
  //   output.push(`NOTE: ${orderName}`);
  // } else 
  if (tableNote) {
    output.push(`NOTE: ${tableNote}`);
  }

  output.push(`TIME: ${time}`);
  output.push(line);
  output.push("");

  // 🔹 PRINT PER CATEGORY
  for (const [category, categoryItems] of Object.entries(grouped)) {
    output.push(category);

    categoryItems.forEach(item => {
      output.push(`${item.qty}x ${item.name}`);

      item.notes?.forEach(n => {
        output.push(`  - ${n}`);
      });

      if (item.customNote) {
        output.push(`  * ${item.customNote}`);
      }
    });

    output.push("");
  }

  output.push(line);
  output.push(BIG_OFF);
  return output.join("\n");
}
