import { Link, useRouterState } from "@tanstack/react-router";
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
  UtensilsCrossed,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { hasAccess, useCurrentMembership, type PermissionKey } from "@/lib/permissions";

const overview = [
  { title: "Sales Overview", url: "/", icon: LayoutDashboard, permission: "sales_overview" },
  { title: "Product Mix", url: "/product-mix", icon: PieChart, permission: "product_mix" },
  { title: "Inventory & Ordering", url: "/inventory", icon: Package, permission: "inventory" },
  { title: "Invoices", url: "/invoices", icon: Receipt, permission: "invoices" },
] satisfies {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission: PermissionKey;
}[];

const growth = [
  { title: "Reviews", url: "/reviews", icon: Star, permission: "reviews" },
  { title: "SEO", url: "/seo", icon: Search, permission: "seo" },
  { title: "Marketing", url: "/marketing", icon: Megaphone, permission: "marketing" },
  { title: "Loyalty", url: "/loyalty", icon: Gift, permission: "loyalty" },
] satisfies {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission: PermissionKey;
}[];

const operations = [
  { title: "Scheduling", url: "/scheduling", icon: CalendarClock, permission: "scheduling" },
] satisfies {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission: PermissionKey;
}[];

// Not permission-gated — Admin is owner-only (enforced by manage-team
// itself) but still visible read-only to everyone, and Settings is
// every member's own account, independent of what they're granted.
const ungated = [
  { title: "Admin", url: "/admin", icon: Shield },
  { title: "Settings", url: "/settings", icon: Settings },
];

function visibleFor<T extends { permission: PermissionKey }>(
  items: T[],
  membership: ReturnType<typeof useCurrentMembership>,
): T[] {
  return items.filter((item) => hasAccess(membership, item.permission));
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));
  const membership = useCurrentMembership();

  const visibleOverview = visibleFor(overview, membership);
  const visibleGrowth = visibleFor(growth, membership);
  const visibleOperations = visibleFor(operations, membership);

  const renderGroup = (label: string, items: (typeof ungated)[number][]) => {
    if (items.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.url)}
                  className="h-10 rounded-lg data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="text-sm">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-base leading-tight">Thrasher's Pub</div>
            <div className="truncate text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Owner Dashboard
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        {renderGroup("Overview", visibleOverview)}
        {renderGroup("Growth", visibleGrowth)}
        {renderGroup("Operations", [...visibleOperations, ...ungated])}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent font-display text-sm text-accent-foreground">
            BS
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">Bali Singh</div>
            <div className="truncate text-[11px] text-muted-foreground">Owner · West Village</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
