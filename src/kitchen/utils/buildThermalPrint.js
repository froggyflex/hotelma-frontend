export function buildThermalPrint({ table, tableNote, items, createdAt }, products) {
  const line = "--------------------------------";

  const time = new Date(createdAt || Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Group items by category
  const grouped = items.reduce((acc, item) => {
    const product = products.find(p => p._id === item.productId);
    const category = (product?.category || "Other").toUpperCase();

    if (!acc[category]) acc[category] = [];
    acc[category].push(item);

    return acc;
  }, {});

  let output = [];
 //table.name
  output.push(line);
  output.push(`TABLE: ${tableNote}`);
  if (tableNote) output.push(`NOTE:---`);
  output.push(`TIME: ${time}`);
  output.push(line);
  output.push("");

  for (const [category, categoryItems] of Object.entries(grouped)) {
    output.push(category);

    categoryItems.forEach(item => {
      output.push(`- ${item.name}`);

      item.notes?.forEach(note => {
        output.push(`  - ${note}`);
      });

      if (item.customNote) {
        output.push(`  * ${item.customNote}`);
      }
    });

    output.push("");
  }

  output.push(line);

  return output.join("\n");
}
