"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { showToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      showToast.error("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirm) {
      showToast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
      });
      showToast.success("Account created! Welcome to De-Prince Digital Hub.");
      router.push("/dashboard");
    } catch (err: any) {
      showToast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(212,168,75,0.15),transparent_60%),#0B0B0B] p-4">
      <Card className="w-full max-w-md border-[#D4A84B]/30 bg-[#151515] shadow-[0_0_40px_rgba(212,168,75,0.12)]">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/assets/logo-mark.svg"
              alt="DE-PRINCE DIGITAL HUB"
              width="72"
              height="72"
              className="h-14 w-14"
            />
          </div>
          <CardTitle className="text-2xl text-white">Create Account</CardTitle>
          <CardDescription className="text-[#A8A8A8]">Join De-Prince Digital Hub</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-[#E8E8E8]">First Name</Label>
                <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-[#E8E8E8]">Last Name</Label>
                <Input id="last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#E8E8E8]">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#E8E8E8]">Phone (optional)</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#E8E8E8]">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-[#E8E8E8]">Confirm</Label>
                <Input id="confirm" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-[#A8A8A8]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#E8C879] hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
