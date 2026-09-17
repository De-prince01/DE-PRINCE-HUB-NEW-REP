"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  MessageSquare,
  Bell,
  Wallet,
  User,
  LogOut,
  Menu,
  X,
  Clock,
  Printer,
  Monitor,
  ShoppingCart,
  Coins,
  Boxes,
  Users,
  ShieldCheck,
  Layers,
  CalendarClock,
  Truck,
  FileText,
  Repeat,
  Share2,
  LifeBuoy,
  BarChart3,
  Lock,
  Landmark,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const customerNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/use", label: "Service Console", icon: ShoppingBag },
  { href: "/verifications", label: "Verifications", icon: ShieldCheck },
  { href: "/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/referrals", label: "Referrals", icon: Share2 },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/privacy", label: "Privacy", icon: Lock },
  { href: "/orders", label: "My Orders", icon: Package },
  { href: "/computers", label: "Computers", icon: Monitor },
  { href: "/printing", label: "Printing", icon: Printer },
  { href: "/workers", label: "Workers", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "Profile", icon: User },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Admin Overview", icon: LayoutDashboard },
  { href: "/admin/services", label: "Services & Pricing", icon: Layers },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { href: "/admin/quotations", label: "Quotations", icon: FileText },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/admin/referrals", label: "Referrals", icon: Share2 },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/business", label: "Business Model", icon: Landmark },
  { href: "/admin/owner", label: "Owner HQ", icon: Crown },
  { href: "/admin/privacy", label: "Data Governance", icon: Lock },
  { href: "/admin/orders", label: "All Orders", icon: Package },
  { href: "/admin/computers", label: "Cyber Café", icon: Clock },
  { href: "/admin/pos", label: "POS Register", icon: ShoppingCart },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/finance", label: "Finance", icon: Coins },
  { href: "/admin/identity", label: "Identity", icon: ShieldCheck },
  { href: "/workers", label: "Workers", icon: Users },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ownerRole = user && (user.role === "super_admin" || user.role === "business_owner");
  const shownAdminNav = adminNav.filter(
    (item) => item.href !== "/admin/owner" || ownerRole
  );
  const nav = user && user.role !== "customer" ? [...customerNav, ...shownAdminNav] : customerNav;

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-[#111111] transition-transform lg:translate-x-0 lg:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-[#D4A84B]/20 px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/assets/logo-mark.svg"
              alt="DE-PRINCE DIGITAL HUB"
              width="32"
              height="32"
              className="h-8 w-8"
            />
            <span className="font-semibold text-white">De-Prince Hub</span>
          </Link>
          <button className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-[#D4A84B]/15 text-[#E8C879] font-medium border-l-2 border-[#D4A84B]"
                    : "text-[#A8A8A8] hover:bg-[#222] hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#D4A84B]/20 p-3">
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#D4A84B]/20 bg-[#111111]/95 backdrop-blur px-4 py-3 lg:px-6">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative p-2 rounded-full hover:bg-[#222]">
              <Bell className="h-5 w-5" />
            </Link>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-[#A8A8A8] capitalize">{user?.role.replace("_", " ")}</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#E8C879] to-[#B8860B] flex items-center justify-center text-[#0B0B0B] text-sm font-bold">
              {user?.first_name?.charAt(0)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
