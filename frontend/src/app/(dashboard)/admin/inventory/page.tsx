"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Boxes, ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";

interface Item {
  id: string;
  name: string;
  category?: string | null;
  sku?: string | null;
  quantity: number;
  unit: string;
  purchase_price: number;
  selling_price: number;
  low_stock_threshold: number;
  supplier?: string | null;
}

interface StockPayload {
  inventory_id: string;
  quantity: number;
  ref?: string;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLow, setShowLow] = useState(false);

  const [form, setForm] = useState({
    name: "",
    category: "",
    sku: "",
    quantity: 0,
    unit: "piece",
    purchase_price: 0,
    selling_price: 0,
    low_stock_threshold: 10,
    supplier: "",
  });
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({});
  const [refByItem, setRefByItem] = useState<Record<string, string>>({});

  const load = async (low: boolean = showLow) => {
    setLoading(true);
    try {
      const route = low ? "/inventory/low-stock" : "/inventory";
      const data = await api<Item[]>(route);
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLow = () => {
    setShowLow((v) => {
      load(!v);
      return !v;
    });
  };

  const createItem = async () => {
    if (!form.name) {
      showToast.error("Name is required");
      return;
    }
    try {
      await api("/inventory", {
        method: "POST",
        body: JSON.stringify(form),
      });
      showToast.success("Item added");
      setForm({ name: "", category: "", sku: "", quantity: 0, unit: "piece", purchase_price: 0, selling_price: 0, low_stock_threshold: 10, supplier: "" });
      await load(false);
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  const moveStock = async (id: string, direction: "in" | "out") => {
    const qty = Number(qtyByItem[id]);
    if (!qty || qty <= 0) {
      showToast.error("Enter a quantity");
      return;
    }
    try {
      await api(`/inventory/stock/${direction}`, {
        method: "POST",
        body: JSON.stringify({ inventory_id: id, quantity: qty, reference: refByItem[id] || undefined }),
      });
      showToast.success(direction === "in" ? "Stock added" : "Stock removed");
      setQtyByItem((q) => ({ ...q, [id]: "" }));
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Track stock and manage supplies</p>
        </div>
        <Button variant={showLow ? "default" : "outline"} onClick={toggleLow} disabled={loading}>
          {showLow ? "All items" : "Low stock"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="A4 Paper" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Supplies" />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="OPTIONAL" />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="piece" />
            </div>
            <div>
              <Label>Qty</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Buy price</Label>
              <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Sell price</Label>
              <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Low-stock alert</Label>
              <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} />
            </div>
          </div>
          <Button onClick={createItem} className="mt-3">
            <Boxes className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{showLow ? "Low Stock Items" : "Inventory Items"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">No items found.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const low = item.quantity <= item.low_stock_threshold;
                return (
                  <div key={item.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="font-medium flex items-center gap-2">
                        {item.name}
                        {low && <Badge className="bg-red-100 text-red-700">Low</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.category || "Uncategorized"} · {item.sku ? `SKU ${item.sku}` : "No SKU"} · {formatNaira(item.purchase_price)} buy / {formatNaira(item.selling_price)} sell
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">In stock</p>
                        <p className={`font-semibold ${low ? "text-red-600" : ""}`}>{item.quantity} {item.unit}</p>
                      </div>
                      <Input
                        className="w-16"
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={qtyByItem[item.id] || ""}
                        onChange={(e) => setQtyByItem((q) => ({ ...q, [item.id]: e.target.value }))}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => moveStock(item.id, "in")} title="Stock in">
                          <ArrowDownToLine className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => moveStock(item.id, "out")} title="Stock out">
                          <ArrowUpFromLine className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
