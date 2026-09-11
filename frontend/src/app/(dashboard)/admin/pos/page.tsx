"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectItem } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  base_price?: number;
  unit_price?: number;
  quantity?: number;
  kind: "service" | "inventory";
}

interface CartLine {
  key: string;
  productId: string;
  name: string;
  unit_price: number;
  quantity: number;
  kind: "service" | "inventory";
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [services, inventory] = await Promise.all([
        api<Product[]>("/pos/services"),
        api<Product[]>("/pos/inventory"),
      ]);
      setProducts([...(services || []), ...(inventory || [])]);
    } catch {
      setProducts([]);
    }
  };

  const add = (p: Product) => {
    const key = `${p.kind}-${p.id}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        const cap = p.kind === "inventory" ? p.quantity || 99 : 99;
        if (existing.quantity >= cap) return prev;
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          productId: p.id,
          name: p.name,
          unit_price: p.kind === "service" ? p.base_price || 0 : p.unit_price || 0,
          quantity: 1,
          kind: p.kind,
        },
      ];
    });
  };

  const remove = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));
  const updateQty = (key: string, qty: number) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, qty) } : l)));

  const total = cart.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) {
      showToast.error("Cart is empty");
      return;
    }
    setCheckingOut(true);
    try {
      const result = await api<any>("/pos/checkout", {
        method: "POST",
        body: JSON.stringify({
          lines: cart.map((l) => ({
            ...(l.kind === "service" ? { service_id: l.productId } : { inventory_id: l.productId }),
            name: l.name,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
          payment_method: paymentMethod,
        }),
      });
      showToast.success(`Sale complete: ${result.order_number}`);
      setCart([]);
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">POS Register</h1>
        <p className="text-muted-foreground">Counter checkout for services and items</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No sellable products configured.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {products.map((p) => (
                  <div key={`${p.kind}-${p.id}`} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatNaira(p.kind === "service" ? p.base_price || 0 : p.unit_price || 0)}
                        {p.kind === "inventory" ? ` · ${p.quantity} in stock` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => add(p)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Cart
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Cart is empty.</p>
            ) : (
              <div className="space-y-2">
                {cart.map((l) => (
                  <div key={l.key} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNaira(l.unit_price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => updateQty(l.key, Number(e.target.value))}
                        className="w-12 rounded-md border px-1 py-0.5 text-sm"
                      />
                      <button onClick={() => remove(l.key)} className="p-1 text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold">{formatNaira(total)}</span>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium">Payment</p>
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
              </Select>
            </div>

            <Button onClick={checkout} disabled={checkingOut || cart.length === 0} className="w-full">
              {checkingOut ? "Processing..." : `Checkout ${cart.length ? formatNaira(total) : ""}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
