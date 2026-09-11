"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { QrCode } from "@/components/ui/qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Receipt } from "lucide-react";
import type { Receipt as ReceiptData } from "@/types";

interface ReceiptDialogProps {
  orderId: string;
}

export function ReceiptDialog({ orderId }: ReceiptDialogProps) {
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    let active = true;
    setLoading(true);
    api<ReceiptData>(`/receipts/orders/${orderId}`)
      .then((data) => {
        if (active) setReceipt(data);
      })
      .catch((err: any) => {
        if (active) showToast.error(err.message || "Could not load receipt");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, orderId]);

  const print = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Receipt className="h-4 w-4" />
        Receipt
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>
            {receipt?.type === "order"
              ? `Order ${receipt.order?.order_number ?? ""}`
              : "Transaction receipt"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : receipt ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-bold tracking-wide">{receipt.business}</p>
              <p className="text-xs text-muted-foreground">
                {receipt.type === "order" ? "Order Receipt" : "Transaction Receipt"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ref: {receipt.receipt_number}
              </p>
            </div>

            {receipt.customer?.name && (
              <div className="text-sm">
                <p>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {receipt.customer.name}
                </p>
                {receipt.customer.email && (
                  <p className="text-muted-foreground">{receipt.customer.email}</p>
                )}
              </div>
            )}

            {receipt.items && receipt.items.length > 0 && (
              <div className="space-y-1.5 rounded-lg border p-3">
                {receipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>
                      {item.service_name} × {item.quantity}
                    </span>
                    <span>{formatNaira(item.total_price)}</span>
                  </div>
                ))}
                {(receipt.subtotal !== undefined || receipt.delivery_fee !== undefined) && (
                  <div className="border-t pt-2 text-xs text-muted-foreground">
                    {receipt.subtotal !== undefined && (
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatNaira(receipt.subtotal)}</span>
                      </div>
                    )}
                    {receipt.delivery_fee ? (
                      <div className="flex justify-between">
                        <span>Delivery</span>
                        <span>{formatNaira(receipt.delivery_fee)}</span>
                      </div>
                    ) : null}
                    {receipt.tax ? (
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatNaira(receipt.tax)}</span>
                      </div>
                    ) : null}
                  </div>
                )}
                {receipt.total !== undefined && (
                  <div className="flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>{formatNaira(receipt.total)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center gap-1">
              <QrCode
                value={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/verify?n=${receipt.receipt_number}`
                    : `/verify?n=${receipt.receipt_number}`
                }
                size={128}
              />
              <p className="text-center text-xs text-muted-foreground">
                Scan to verify this receipt online
              </p>
              <a
                href={`/verify?n=${encodeURIComponent(receipt.receipt_number)}`}
                className="text-xs text-primary hover:underline"
              >
                Verify online
              </a>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={print} className="gap-1.5">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No receipt available.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
