import { ShieldCheck, Timer, Headphones, Printer, Wallet, Truck } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "Trusted & Verified" },
  { icon: Timer, label: "Fast Turnaround" },
  { icon: Headphones, label: "24/7 Support" },
  { icon: Printer, label: "Printing & Bound Copies" },
  { icon: Wallet, label: "Secure Wallet System" },
  { icon: Truck, label: "Doorstep Delivery" },
  { icon: ShieldCheck, label: "NIN · BVN · CAC · JAMB" },
  { icon: Timer, label: "Same-Day Options" },
];

export default function TrustStrip() {
  const doubled = [...ITEMS, ...ITEMS];
  return (
    <div className="trust-strip overflow-hidden">
      <div className="marquee-track flex w-max items-center gap-10 py-3">
        {doubled.map((item, i) => (
          <span key={i} className="trust-item">
            <item.icon className="h-4 w-4" />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}