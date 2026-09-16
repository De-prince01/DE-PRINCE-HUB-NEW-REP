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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      showToast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      showToast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,rgba(212,168,75,0.15),transparent_60%),#0B0B0B] p-4">
      <Card className="w-full max-w-md border-[#D4A84B]/30 bg-[#151515] shadow-[0_0_40px_rgba(212,168,75,0.12)]">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="rounded-full bg-gradient-to-br from-[#E8C879] to-[#B8860B] p-2 w-20 h-20 flex items-center justify-center shadow-[0_0_25px_rgba(212,168,75,0.4)]">
              <img
                src="/assets/logo-mark.svg"
                alt="DE-PRINCE DIGITAL HUB"
                width="72"
                height="72"
                className="h-14 w-14"
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">De-Prince Digital Hub</CardTitle>
          <CardDescription className="text-[#A8A8A8]">Everything Digital. One Platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#E8E8E8]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#E8E8E8]">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-[#A8A8A8]">
            New here?{" "}
            <Link href="/register" className="text-[#E8C879] hover:underline">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
