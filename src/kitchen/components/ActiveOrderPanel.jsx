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
  const sentItems = order?.items || [];
  const hasOrder = !!order;

  const productMap = new Map(
    products.map(p => [String(p._id), p])
  );

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">
            {hasOrder ? "Active Order" : "New Order"}
          </div>

          {hasOrder && (
            <div className="text-xs text-slate-500">
              Opened at {new Date(order.createdAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {hasOrder && (
          <button
            onClick={onCloseTable}
            className="rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white"
          >
            Close table
          </button>
        )}
      </div>

      {/* SENT ITEMS */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-slate-500">
          Sent to kitchen
        </div>

        {sentItems.length === 0 && (
          <div className="text-sm text-slate-400">No items sent yet</div>
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
                    {/* CATEGORY */}
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {category}
                    </div>
                    <div className="font-medium">
                    {item.qty}× {item.name}
                    </div>



                    {/* NOTES */}
                    {(item.notes?.length > 0 || item.customNote) && (
                    <div className="mt-1 text-xs text-slate-500">
                        {[...(item.notes || []), item.customNote]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    )}
                </div>

                {/* DELIVERED BUTTON */}
                {item.status !== "delivered" && (
                    <button
                    onClick={() => onMarkDelivered(item._id)}
                    className="text-xs text-emerald-600 hover:underline"
                    >
                    Mark delivered
                    </button>
                )}
                </div>
            );
            })}

      </div>

      {/* DRAFT ITEMS */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase text-slate-500">
          New items (not sent)
        </div>

        {draftItems.length === 0 && (
          <div className="text-sm text-slate-400">No new items</div>
        )}

        {draftItems.map(item => (
          <div
            key={item.id}
            className="rounded-lg border border-dashed px-3 py-2 text-sm space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {item.name}
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateDraftItem(item.id, { qty: Math.max(1, item.qty - 1) })
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
                  Edit
                </button>

                <button
                  onClick={() => onRemoveDraftItem(item.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
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
        ))}
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
          Send {draftItems.length || ""} new item
          {draftItems.length === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
