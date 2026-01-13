import { v4 as uuidv4 } from "uuid";
import { enqueuePrintJob } from "../services/printQueue";
import { buildThermalPrint } from "../utils/buildThermalPrint";
import { markOrderPrinted } from "../services/kitchenOrdersApi";
import { useTranslation } from "react-i18next";

/* ---------------- HELPERS ---------------- */

function needsReprint(item) {
  return item.printed === true && item.status !== "delivered";
}

/* ---------------- COMPONENT ---------------- */

export default function ActiveOrderPanel({
  order,
  products,
  draftItems,
  onSendNewItems,
  onMarkDelivered,
  onCloseTable,
  onUpdateDraftItem,
  onEditDraftItem,
  onRemoveDraftItem,
}) {
  const { t } = useTranslation();
  const hasOrder = !!order;

  const sentItems = order?.items || [];

  const productMap = new Map(
    products.map(p => [String(p._id), p])
  );

  const reprintableItems = sentItems.filter(needsReprint);

  /* ---------------- REPRINT LOGIC ---------------- */

  async function reprintItems(items) {
    if (!order || !items || items.length === 0) return;

    const attemptId = uuidv4();

    const printPayload = buildThermalPrint(
      {
        table: order.table,
        orderName: order.orderName,
        items,
        createdAt: order.createdAt,
      },
      products
    );

    enqueuePrintJob({
      print: async () => {
        if (!window.AndroidPrinter?.printText) {
          throw new Error("PRINTER_NOT_AVAILABLE");
        }

        const res = JSON.parse(
          window.AndroidPrinter.printText(printPayload)
        );

        if (!res.ok) {
          throw new Error(res.code);
        }
      },

      onSuccess: async () => {
        await new Promise(r => setTimeout(r, 1200));

        await markOrderPrinted(
          order._id,
          items.map(i => i._id),
          attemptId
        );
      },

      onError: err => {
        console.warn("Reprint failed", err);
      }
    });
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-4">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">
            {hasOrder ? "Active Order" : "New Order"}
          </div>

          {hasOrder && (
            <div className="text-xs text-slate-500">
              {t("tables.openedAt")}{" "}
              {new Date(order.createdAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {reprintableItems.length > 0 && (
          <button
            onClick={() => reprintItems(reprintableItems)}
            className="rounded-lg bg-yellow-600 px-3 py-1 text-xs font-medium text-white"
          >
            🔁 Reprint pending ({reprintableItems.length})
          </button>
        )}
      </div>

      {/* SENT / ACTIVE ITEMS */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-slate-500">
          {t("order.sendToKitchen")}
        </div>

        {sentItems.length === 0 && (
          <div className="text-sm text-slate-400">
            {t("order.noItemSent")}
          </div>
        )}

        {sentItems.map(item => {
          const product = productMap.get(String(item.productId));
          const category = product?.category || "Other";

          return (
            <div
              key={item._id}
              className="flex items-start justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                  {category}
                </div>

                <div className="font-medium">
                  {item.qty}× {item.name}
                </div>

                {(item.notes?.length > 0 || item.customNote) && (
                  <div className="mt-1 text-xs text-slate-500">
                    {[...(item.notes || []), item.customNote]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}

                {needsReprint(item) && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs rounded bg-yellow-100 px-2 py-0.5 text-yellow-800">
                      Printed
                    </span>

                    <button
                      onClick={() => reprintItems([item])}
                      className="text-xs text-yellow-700 hover:underline"
                    >
                      🔁 Reprint
                    </button>
                  </div>
                )}
              </div>

              {item.status !== "delivered" && (
                <button
                  onClick={() => onMarkDelivered(item._id)}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  {t("order.markDelivered")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* DRAFT ITEMS */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-slate-500">
          {t("order.newItemsNotSent")}
        </div>

        {draftItems.length === 0 && (
          <div className="text-sm text-slate-400">
            {t("order.noItems")}
          </div>
        )}

        {draftItems.map(item => {
          const product = productMap.get(String(item.productId));
          const category = product?.category || "Other";

          return (
            <div
              key={item.id}
              className="rounded-lg border border-dashed px-3 py-2 text-sm space-y-1"
            >
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {category}
              </div>

              <div className="flex items-center justify-between">
                <div className="font-medium">{item.name}</div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateDraftItem(item.id, {
                        qty: Math.max(1, item.qty - 1),
                      })
                    }
                    className="px-2 rounded border"
                  >
                    −
                  </button>

                  <span className="min-w-[1.5rem] text-center">
                    {item.qty}
                  </span>

                  <button
                    onClick={() =>
                      onUpdateDraftItem(item.id, { qty: item.qty + 1 })
                    }
                    className="px-2 rounded border"
                  >
                    +
                  </button>

                  <button
                    onClick={() => onEditDraftItem(item)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {t("order.edit")}
                  </button>

                  <button
                    onClick={() => onRemoveDraftItem(item.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {t("order.remove")}
                  </button>
                </div>
              </div>

              {(item.notes?.length > 0 || item.customNote) && (
                <div className="text-xs text-slate-500">
                  {[...(item.notes || []), item.customNote]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SEND BUTTON */}
      <div className="pt-2">
        <button
          onClick={onSendNewItems}
          disabled={draftItems.length === 0}
          className={`w-full rounded-xl px-4 py-2 text-sm font-medium text-white ${
            draftItems.length > 0
              ? "bg-slate-900 hover:bg-slate-800"
              : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {t("order.newItem")}
        </button>
      </div>
    </div>
  );
}
