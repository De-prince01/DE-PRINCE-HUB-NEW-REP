import {
  BookOpen,
  Printer,
  Palette,
  Code,
  Monitor,
  Globe,
  Landmark,
  Fingerprint,
  Search,
  ShieldCheck,
  Shield,
  GraduationCap,
  FileText,
  FileSearch,
  FilePenLine,
  FileBadge,
  FileOutput,
  Files,
  PenLine,
  List,
  Table2,
  Presentation,
  Copy,
  ScanLine,
  Layers,
  Camera,
  CreditCard,
  Image as ImageIcon,
  Share2,
  Sparkles,
  Layout,
  Settings,
  ShoppingCart,
  Server,
  HardDrive,
  Wifi,
  Download,
  Cpu,
  Building2,
  Briefcase,
  Vote,
  Stamp,
  Plane,
  UserRound,
  Phone,
  PhoneCall,
  Smartphone,
  Ticket,
  BadgeCheck,
  Contact,
  type LucideIcon,
} from "lucide-react";

const ICON_REGISTRY: Record<string, LucideIcon> = {
  BookOpen,
  Printer,
  Palette,
  Code,
  Monitor,
  Globe,
  Landmark,
  Fingerprint,
  Search,
  ShieldCheck,
  Shield,
  GraduationCap,
  FileText,
  FileSearch,
  FilePenLine,
  FileBadge,
  FileOutput,
  Files,
  PenLine,
  List,
  Table2,
  Presentation,
  Copy,
  ScanLine,
  Layers,
  Camera,
  CreditCard,
  Image: ImageIcon,
  Share2,
  Sparkles,
  Layout,
  Settings,
  ShoppingCart,
  Server,
  HardDrive,
  Wifi,
  Download,
  Cpu,
  Building2,
  Briefcase,
  Vote,
  Stamp,
  Plane,
  UserRound,
  Phone,
  PhoneCall,
  Smartphone,
  Ticket,
  BadgeCheck,
  Contact,
};

const SLUG_ICONS: Record<string, string> = {
  // Academic
  "assignment-typing": "PenLine",
  "project-typing": "PenLine",
  "apa-formatting": "FileText",
  "table-of-contents": "List",
  "powerpoint-presentation": "Presentation",
  "data-entry": "Table2",
  // Printing
  "bw-printing": "Printer",
  "colour-printing": "Printer",
  scanning: "ScanLine",
  photocopying: "Copy",
  binding: "BookOpen",
  lamination: "Layers",
  "passport-photography": "Camera",
  // Graphic design
  "logo-design": "Sparkles",
  "flyer-design": "Image",
  "business-card": "CreditCard",
  "social-media-graphics": "Share2",
  "brand-identity": "Palette",
  // Web development
  "business-website": "Globe",
  "landing-page": "Layout",
  "ecommerce-website": "ShoppingCart",
  "web-application": "Code",
  "website-maintenance": "Settings",
  "domain-hosting-setup": "Server",
  // Computer services
  "windows-installation": "Monitor",
  "software-installation": "Download",
  "virus-cleanup": "Shield",
  "system-optimization": "Cpu",
  "data-backup": "HardDrive",
  "network-configuration": "Wifi",
  // Online services
  "school-application": "GraduationCap",
  "job-application": "Briefcase",
  "government-portal": "Landmark",
  "business-registration": "Building2",
  // JAMB services
  "jamb-utme-registration": "GraduationCap",
  "jamb-profile-creation": "UserRound",
  "jamb-epin-printing": "Ticket",
  "jamb-correction": "FilePenLine",
  "jamb-cbt-practice": "Cpu",
  "post-utme-registration": "GraduationCap",
  "jamb-original-result-slip-printout": "FileText",
  "jamb-2026-exam-slip-printing": "Printer",
  "jamb-admission-letter-printout": "FileBadge",
  "jamb-reprints-other": "Files",
  "jamb-reprint-original-result-slip": "FileOutput",
  // Government & Identity
  "nin-registration": "Fingerprint",
  "nin-retrieval-print": "FileSearch",
  "nin-search": "Search",
  "nin-search-v1": "FileSearch",
  "nin-verification-v3": "ShieldCheck",
  "nin-search-v4": "FileSearch",
  "nin-demography-search-v1": "Contact",
  "nin-verification": "BadgeCheck",
  "bvn-registration": "Fingerprint",
  "bvn-search": "Fingerprint",
  "bvn-v2-search": "Fingerprint",
  "phone-number-search": "Phone",
  "phone-number-search-v3": "Smartphone",
  "phone-number-search-v4": "Smartphone",
  "phone-verification-v1": "PhoneCall",
  "cac-business-registration": "Building2",
  "cac-business-search": "Search",
  "voter-registration": "Vote",
  "verification-centre": "ShieldCheck",
  "nysc-registration": "GraduationCap",
  "document-attestation": "Stamp",
  "passport-booking": "Plane",
};

const CATEGORY_ICONS: Record<string, string> = {
  "academic services": "BookOpen",
  academic: "BookOpen",
  printing: "Printer",
  "graphic design": "Palette",
  design: "Palette",
  "web development": "Code",
  web: "Code",
  "computer services": "Monitor",
  computer: "Monitor",
  "online services": "Globe",
  online: "Globe",
  "jamb services": "GraduationCap",
  jamb: "GraduationCap",
  "government & identity": "Landmark",
  "government and identity": "Landmark",
  government: "Landmark",
  identity: "ShieldCheck",
};

export interface ServiceIconInput {
  slug?: string | null;
  name?: string | null;
  icon?: string | null;
  categoryName?: string | null;
}

/** Resolve a Lucide icon component for a service (logo/icon). */
export function resolveServiceIcon(input: ServiceIconInput): LucideIcon {
  const { slug, icon, categoryName } = input;

  if (icon && ICON_REGISTRY[icon]) {
    return ICON_REGISTRY[icon];
  }
  if (slug && SLUG_ICONS[slug] && ICON_REGISTRY[SLUG_ICONS[slug]]) {
    return ICON_REGISTRY[SLUG_ICONS[slug]];
  }
  if (categoryName) {
    const key = categoryName.toLowerCase();
    if (CATEGORY_ICONS[key] && ICON_REGISTRY[CATEGORY_ICONS[key]]) {
      return ICON_REGISTRY[CATEGORY_ICONS[key]];
    }
  }
  return BookOpen;
}

/** Resolve a Lucide icon for a category (used on category cards/nav). */
export function resolveCategoryIcon(categoryName?: string | null): LucideIcon {
  if (categoryName) {
    const key = categoryName.toLowerCase();
    if (CATEGORY_ICONS[key] && ICON_REGISTRY[CATEGORY_ICONS[key]]) {
      return ICON_REGISTRY[CATEGORY_ICONS[key]];
    }
  }
  return BookOpen;
}
