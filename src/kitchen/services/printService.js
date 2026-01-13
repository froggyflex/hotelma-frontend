// services/printService.js
let isPrinting = false;

const delay = ms => new Promise(r => setTimeout(r, ms));

export async function printSafely(payload) {
  if (!window.AndroidPrinter?.print) {
    throw new Error("ANDROID_BRIDGE_NOT_AVAILABLE");
  }

  if (isPrinting) {
    throw new Error("PRINT_IN_PROGRESS");
  }

  isPrinting = true;

  try {
    // 🔔 Wake up printer
    await window.AndroidPrinter.print("\n");
    await delay(400);

    // 🖨️ Actual print
    await window.AndroidPrinter.print(payload);

    return true;
  } finally {
    // ⏳ Cooldown is CRITICAL
    await delay(1200);
    isPrinting = false;
  }
}
