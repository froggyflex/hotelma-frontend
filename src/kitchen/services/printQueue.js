let queue = [];
let isProcessing = false;

const delay = ms => new Promise(r => setTimeout(r, ms));

async function processQueue() {
  if (isProcessing) return;
  if (queue.length === 0) return;

  isProcessing = true;

  const job = queue.shift();

  try {
    await job.print();      // actual printing
    await job.onSuccess();  // mark printed, refresh order
  } catch (err) {
    console.error("Print job failed", err);
    job.onError?.(err);
  } finally {
    // ⏳ cooldown between jobs (CRITICAL)
    await delay(1500);
    isProcessing = false;

    // 🔁 process next
    processQueue();
  }
}

export function enqueuePrintJob(job) {
  queue.push(job);
  processQueue();
}
