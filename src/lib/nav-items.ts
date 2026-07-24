import {
  LayoutDashboard,
  PieChart,
  Package,
  Receipt,
  Star,
  Search,
  Megaphone,
  Gift,
  CalendarClock,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { PermissionKey } from "@/lib/permissions";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  permission: PermissionKey;
};

// Single source of truth for every gated nav destination — shared by
// AppSidebar and the global search palette so the two never drift.
export const NAV_OVERVIEW: NavItem[] = [
  { title: "Home", url: "/", icon: LayoutDashboard, permission: "sales_overview" },
  { title: "Product Mix", url: "/product-mix", icon: PieChart, permission: "product_mix" },
  { title: "Inventory & Ordering", url: "/inventory", icon: Package, permission: "inventory" },
  { title: "Invoices", url: "/invoices", icon: Receipt, permission: "invoices" },
];

export const NAV_GROWTH: NavItem[] = [
  { title: "Reviews", url: "/reviews", icon: Star, permission: "reviews" },
  { title: "SEO", url: "/seo", icon: Search, permission: "seo" },
  { title: "Marketing", url: "/marketing", icon: Megaphone, permission: "marketing" },
  { title: "Loyalty", url: "/loyalty", icon: Gift, permission: "loyalty" },
];

export const NAV_OPERATIONS: NavItem[] = [
  { title: "Scheduling", url: "/scheduling", icon: CalendarClock, permission: "scheduling" },
];

// Not permission-gated — Admin is owner-only (enforced by manage-team
// itself) but still visible read-only to everyone, and Settings is
// every member's own account, independent of what they're granted.
export const NAV_UNGATED: { title: string; url: string; icon: LucideIcon }[] = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];
