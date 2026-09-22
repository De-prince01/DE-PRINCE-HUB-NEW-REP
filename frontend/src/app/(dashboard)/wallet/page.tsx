"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/utils";
import { showToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import {
  Wallet, ArrowDownRight, ArrowUpRight, Landmark, CheckCircle2, XCircle,
} from "lucide-react";

interface Bank {
  code: string;
  name: string;
  slug?: string;
  longcode?: string;
  is_commercial?: boolean;
  is_microfinance?: boolean;
}

interface BankAccount {
  bank_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  account_verified: boolean;
}

interface Tx {
  id: string;
  type: string;
  amount: number;
  reference: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  reference: string;
  amount: number;
  bank_code: string;
  account_number: string;
  account_name: string | null;
  status: string;
  admin_note: string | null;
  requested_at: string;
}

export default function WalletPage() {
  const [data, setData] = useState<{ balance: number; transactions: Tx[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [funding, setFunding] = useState(false);

  // Bank account
  const [banks, setBanks] = useState<Bank[]>([]);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [acctNo, setAcctNo] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // Withdrawals
  const [withdraw, setWithdraw] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const loadWallet = useCallback(async () => {
    try {
      const [wallet, transactions, acct, wd] = await Promise.all([
        api<{ balance: number }>("/wallet"),
        api<Tx[]>("/wallet/transactions"),
        api<BankAccount>("/wallet/bank").catch(() => null),
        api<Withdrawal[]>("/wallet/withdrawals"),
      ]);
      setData({ balance: wallet.balance, transactions: transactions || [] });
      setAccount(acct);
      setWithdrawals(wd || []);
      if (acct?.bank_code) setBankCode(acct.bank_code);
      if (acct?.account_number) setAcctNo(acct.account_number);
      if (acct?.account_name) setResolvedName(acct.account_name);
    } catch {
      setData({ balance: 0, transactions: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
    api<Bank[]>("/banks").then(setBanks).catch(() => setBanks([]));
  }, [loadWallet]);

  const fundWallet = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      showToast.error("Enter a valid amount");
      return;
    }
    setFunding(true);
    try {
      await api("/wallet/fund", {
        method: "POST",
        body: JSON.stringify({ amount: val, provider: "dev_mock" }),
      });
      showToast.success("Wallet funded (mock)");
      setAmount("");
      await loadWallet();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setFunding(false);
    }
  };

  const verifyAccount = async () => {
    if (!bankCode) return showToast.error("Select a bank");
    if (!/^\d{10}$/.test(acctNo)) return showToast.error("Enter a 10-digit account number");
    try {
      const res = await api<any>("/wallet/bank/verify", {
        method: "POST",
        body: JSON.stringify({ bank_code: bankCode, account_number: acctNo }),
      });
      if (!res.valid) return showToast.error("Account not found");
      setResolvedName(res.account_name);
      showToast.success(`Name confirmed: ${res.account_name}`);
    } catch (err: any) {
      showToast.error(err.message);
    }
  };

  const saveBank = async () => {
    if (!bankCode) return showToast.error("Select a bank");
    if (!/^\d{10}$/.test(acctNo)) return showToast.error("Enter a 10-digit account number");
    setSavingBank(true);
    try {
      const saved = await api<any>("/wallet/bank", {
        method: "POST",
        body: JSON.stringify({ bank_code: bankCode, account_number: acctNo }),
      });
      setAccount(saved);
      setResolvedName(saved.account_name);
      showToast.success("Bank account saved");
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setSavingBank(false);
    }
  };

  const requestWithdrawal = async () => {
    const val = parseFloat(withdraw);
    if (!val || val <= 0) return showToast.error("Enter a valid amount");
    if (val < 500) return showToast.error("Minimum withdrawal is ₦500");
    if (!account?.account_verified) return showToast.error("Save a verified bank account first");
    setWithdrawing(true);
    try {
      await api("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: val }),
      });
      showToast.success("Withdrawal requested — pending approval");
      setWithdraw("");
      await loadWallet();
    } catch (err: any) {
      showToast.error(err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      approved: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      failed: "bg-red-100 text-red-700",
    };
    return (
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[s] || "bg-gray-100 text-gray-700"}`}>
        {s.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Fund your wallet, save a bank account and withdraw</p>
      </div>

      <Card className="bg-gradient-to-br from-primary to-violet-700 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Wallet className="h-5 w-5" />
            <span className="text-sm">Available Balance</span>
          </div>
          <p className="mt-2 text-4xl font-bold">{loading ? "…" : formatNaira(data?.balance || 0)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fund Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[#D4A84B]/25 bg-[#111111] p-4">
              <p className="text-sm font-semibold text-[#E8C879]">Transfer to fund your wallet</p>
              <p className="mt-2 text-sm leading-relaxed text-[#A8A8A8]">
                Send to the account below, then click <span className="font-medium text-white">"I have paid"</span> and
                upload your Moniepoint receipt proof. Staff confirms before your wallet is credited.
              </p>
              <div className="mt-3 space-y-1 rounded-md bg-[#0B0B0B] p-3">
                <p className="text-xs tracking-wide text-[#A8A8A8]">MONIEPOINT (De-PRINCE DIGITAL HUB receiving account)</p>
                <p className="text-sm font-bold tracking-wider text-white">8100200730</p>
                <p className="text-sm font-medium text-[#E8C879]">railwan abdul</p>
              </div>
              <div className="mt-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>
              <Button onClick={fundWallet} disabled={funding} className="w-full">
                {funding ? "Processing..." : "Fund Wallet"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdraw to Bank</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                min="500"
                value={withdraw}
                onChange={(e) => setWithdraw(e.target.value)}
                placeholder="e.g. 2000"
              />
              <p className="mt-1 text-xs text-muted-foreground">Minimum withdrawal ₦500. Approved by admin.</p>
            </div>
            <Button onClick={requestWithdrawal} disabled={withdrawing} className="w-full">
              {withdrawing ? "Submitting..." : "Request Withdrawal"}
            </Button>
            {account?.account_verified ? (
              <p className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Withdrawal bank: {account.bank_name} •••{account.account_number?.slice(-4)}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <XCircle className="h-4 w-4" /> No withdrawal bank saved yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bank Account for Payouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Bank</Label>
              <Select value={bankCode} onValueChange={(v) => setBankCode(v)} placeholder="Select bank" disabled={account?.account_verified}>
                {banks.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{banks.length} banks (commercial + microfinance)</p>
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={acctNo}
                onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit account number"
                maxLength={10}
                disabled={account?.account_verified}
              />
            </div>
          </div>

          {resolvedName && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Account Name (name-enquiry)</p>
              <p className="flex items-center gap-2 font-semibold">
                <Landmark className="h-4 w-4 text-primary" /> {resolvedName}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={verifyAccount} disabled={!bankCode || acctNo.length !== 10}>
              Verify
            </Button>
            <Button onClick={saveBank} disabled={savingBank || !bankCode || acctNo.length !== 10} className="flex-1">
              {account?.account_verified ? "Saved" : savingBank ? "Saving..." : "Save Bank Account"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No withdrawal requests yet.</p>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{w.reference} · {w.account_name || "bank transfer"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(w.requested_at).toLocaleString()}</p>
                      {w.admin_note && <p className="mt-1 text-xs text-muted-foreground">Note: {w.admin_note}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">-{formatNaira(w.amount)}</p>
                      {statusBadge(w.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.transactions.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="space-y-3">
                {(data?.transactions || []).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <ArrowDownRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{tx.reference}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount > 0 ? "+" : "-"}{formatNaira(Math.abs(tx.amount))}
                    </span>
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