"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira, formatDate } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wallet, Receipt, TrendingDown, TrendingUp } from "lucide-react";
import type { FinanceReport } from "@/types";

interface Expense {
  id: string;
  amount: number;
  category?: string | null;
  description?: string | null;
  date: string;
}

interface Commission {
  id: string;
  worker_id: string;
  worker_amount: number;
  commission_amount: number;
  is_paid: boolean;
  created_at: string;
}

export default function AdminFinancePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const [expForm, setExpForm] = useState({ amount: 0, category: "", description: "" });
  const [paying, setPaying] = useState<string | null>(null);
  const [report, setReport] = useState<FinanceReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [e, c, r] = await Promise.all([
        api<Expense[]>("/finance/expenses"),
        api<Commission[]>("/finance/commissions"),
        api<FinanceReport>("/finance/report").catch(() => null),
      ]);
      setExpenses(e || []);
      setCommissions(c || []);
      setReport(r || null);
    } catch {
      setExpenses([]);
      setCommissions([]);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addExpense = async () => {
    if (!expForm.amount || expForm.amount <= 0) {
      showToast.error("Enter an amount");
      return;
    }
    try {
      await api("/finance/expenses", {
        method: "POST",
        body: JSON.stringify(expForm),
      });
      showToast.success("Expense recorded");
      setExpForm({ amount: 0, category: "", description: "" });
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  const payCommission = async (id: string) => {
    setPaying(id);
    try {
      await api(`/finance/commissions/${id}/pay`, { method: "POST", body: "{}" });
      showToast.success("Commission paid to worker wallet");
      await load();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setPaying(null);
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCommissions = commissions.reduce((s, c) => s + c.worker_amount, 0);
  const unpaidCommissions = commissions.filter((c) => !c.is_paid).reduce((s, c) => s + c.worker_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance</h1>
        <p className="text-muted-foreground">Track expenses and worker commissions</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expenses</p>
            <p className="text-2xl font-bold">{formatNaira(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Commissions (all)</p>
            <p className="text-2xl font-bold">{formatNaira(totalCommissions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Commission due</p>
            <p className="text-2xl font-bold text-amber-600">{formatNaira(unpaidCommissions)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Report & Worker Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatNaira(report.revenue)}</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatNaira(report.expenses)}</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Commissions paid</p>
                <p className="text-xl font-bold">{formatNaira(report.commissions_paid)}</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Commissions unpaid</p>
                <p className="text-xl font-bold text-amber-600">{formatNaira(report.commissions_unpaid)}</p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Worker payouts</p>
                <p className="text-xl font-bold">{formatNaira(report.worker_payouts)}</p>
                <p className="text-xs text-muted-foreground">{report.workers_paid} worker(s) paid</p>
              </div>
              <div className="rounded-lg border bg-green-50 p-4">
                <p className="text-sm text-green-700">Net profit</p>
                <p className="text-xl font-bold text-green-700">{formatNaira(report.net_profit)}</p>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Report unavailable (admin access required).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" /> Record Expense
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (₦)</Label>
                <Input type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })} placeholder="Utilities" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
            </div>
            <Button onClick={addExpense} className="w-full">
              <Receipt className="mr-2 h-4 w-4" /> Record Expense
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:max-h-[480px] lg:overflow-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-muted-foreground">Loading…</p>
            ) : commissions.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No commissions yet.</p>
            ) : (
              <div className="space-y-2">
                {commissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                    <div>
                      <p className="text-sm font-medium">Worker {c.worker_id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatNaira(c.worker_amount)}</span>
                      {c.is_paid ? (
                        <Badge className="bg-green-100 text-green-700">Paid</Badge>
                      ) : (
                        <Button size="sm" onClick={() => payCommission(c.id)} disabled={paying === c.id}>
                          Pay
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
