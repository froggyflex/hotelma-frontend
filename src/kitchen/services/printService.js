// services/printService.js
let isPrinting = false;

const delay = ms => new Promise(r => setTimeout(r, ms));

export async function printSafely(payload) {
  if (!window.Android?.print) {
    throw new Error("ANDROID_BRIDGE_NOT_AVAILABLE");
  }

  if (isPrinting) {
    throw new Error("PRINT_IN_PROGRESS");
  }

  isPrinting = true;

  try {
    // 🔔 Wake up printer
    await window.Android.print("\n");
    await delay(400);

    // 🖨️ Actual print
    await window.Android.print(payload);

    return true;
  } finally {
    // ⏳ Cooldown is CRITICAL
    await delay(1200);
    isPrinting = false;
  }
}
