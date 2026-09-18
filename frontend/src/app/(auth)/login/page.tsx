"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { showToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(identifier, password);
      showToast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      showToast.error(err.message || "Login failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0B0B] lg:grid lg:grid-cols-2">
      {/* LEFT: sign-in form */}
      <div className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <Image
              src="/assets/logo-mark.svg"
              alt="DEPRINCE DIGITAL HUB logo"
              width={56}
              height={56}
              className="h-14 w-14 drop-shadow-[0_0_20px_rgba(212,168,75,0.45)]"
            />
            <div>
              <p className="text-lg font-bold tracking-tight text-white">
                DEPRINCE{" "}
                <span className="text-[#E8C879]">DIGITAL HUB</span>
              </p>
              <p className="text-xs text-[#A8A8A8]">
                Everything Digital. One Platform.
              </p>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white">
            Welcome Back <span className="inline-block">👋</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#A8A8A8]">
            Sign in to your DEPRINCEDIGITALHUB account and continue your digital
            journey.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm text-[#E8E8E8]">
                Email or Phone Number
              </Label>
              <Input
                id="identifier"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-[#E8E8E8]">
                  Password
                </Label>
                <Link
                  href="mailto:deprince969@gmail.com?subject=Forgot%20Password%20%E2%80%93%20DEPRINCE%20DIGITAL%20HUB"
                  className="text-xs font-medium text-[#E8C879] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#A8A8A8] transition hover:text-[#E8C879]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#A8A8A8]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#4a4a4a] bg-[#181818] accent-[#D4A84B]"
                />
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#E8C879] to-[#B8860B] text-[#0B0B0B] hover:from-[#F2D68F] hover:to-[#C9961F]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#2a2a2a]" />
            <span className="text-xs text-[#6e6e6e]">New to the hub?</span>
            <div className="h-px flex-1 bg-[#2a2a2a]" />
          </div>

          <Link href="/register" className="block">
            <Button
              variant="outline"
              className="w-full border-[#D4A84B]/40 text-[#E8C879] hover:bg-[#D4A84B]/10"
            >
              Create an Account
            </Button>
          </Link>

          <div className="mt-8 flex items-center justify-center gap-5 text-[#A8A8A8]">
            <span className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-4 w-4 text-[#E8C879]" /> Secure
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <Zap className="h-4 w-4 text-[#E8C879]" /> Fast
            </span>
            <span className="flex items-center gap-1.5 text-xs">
              <Lock className="h-4 w-4 text-[#E8C879]" /> Reliable
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT: photograph (desktop) */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/deprince-login.jpg"
          alt="Student using DEPRINCE DIGITAL HUB on a laptop"
          fill
          priority
          sizes="(max-width: 1024px) 0px, 50vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B]/60 via-transparent to-transparent" />
        <div className="absolute bottom-10 left-0 right-0 bg-gradient-to-t from-[#0B0B0B]/85 via-[#0B0B0B]/40 to-transparent p-10 pt-24">
          <p className="text-2xl font-bold text-white sm:text-3xl">
            Everything Digital.{" "}
            <span className="text-[#E8C879]">One Platform.</span>
          </p>
          <p className="mt-2 text-sm text-[#E8E8E8]/90">
            Services, verifications, printing, graphics, web design and more —
            all from DEPRINCE DIGITAL HUB.
          </p>
        </div>
      </div>

      {/* BOTTOM: photograph (mobile) */}
      <div className="relative aspect-video w-full lg:hidden">
        <Image
          src="/images/deprince-login.jpg"
          alt="Student using DEPRINCE DIGITAL HUB on a laptop"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B]/80 to-transparent" />
      </div>
    </div>
  );
}