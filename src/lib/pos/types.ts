// ============================================================
// POS integration contract — Product Mix
// ------------------------------------------------------------
// This is the typed contract the Lovable UI consumes. Claude
// will implement the Toast adapter on the backend side and
// fulfill these shapes. Keep changes here in sync with both
// the Toast Orders/Menus API mapping and the UI selectors.
// ============================================================

export type POSProvider = "toast" | "square" | "clover" | "lightspeed";

export type POSConnection = {
  provider: POSProvider;
  restaurantGuid: string;        // Toast restaurantGuid
  locationName: string;
  status: "connected" | "syncing" | "error" | "disconnected";
  lastSyncAt: string;            // ISO timestamp
  nextSyncAt: string;            // ISO timestamp
  refreshIntervalSec: number;    // 300 = every 5 min
  errorMessage?: string;
};

// Raw item as returned by Toast Menus API (subset we care about).
export type POSMenuItem = {
  posItemId: string;             // Toast guid
  posItemName: string;           // POS-side name (often messy)
  posCategoryName: string;       // POS-side category
  posPrice: number;              // current menu price
  posCost?: number;              // optional; from Toast inventory if mapped
};

// One row of the product-mix aggregate, per item per period.
export type POSMixRow = {
  posItemId: string;
  displayName: string;           // after alias resolution
  category: string;              // after grouping
  station?: string;
  unitsSold: number;
  grossRevenue: number;
  netRevenue: number;            // gross - discounts - voids
  discounts: number;
  voids: number;
  comps: number;
  modifiersRevenue: number;
  avgTicketTimeSec?: number;
  rating?: number;               // from review aggregator, optional
  daypartBreakdown: Record<string, { units: number; revenue: number }>;
};

// Time selection
export type POSRange = {
  start: string; // ISO
  end: string;   // ISO
  granularity: "hour" | "day" | "week";
};

// ----------- Customizations layered on top of POS data -----------

export type RecipeOverride = {
  posItemId: string;
  costPerUnit: number;           // overrides posCost in margin math
  yields?: number;               // e.g. 1 burger uses 0.12 of a beef tenderloin lb
  notes?: string;
  updatedAt: string;
  updatedBy: string;
};

export type ItemAlias = {
  // One canonical item assembled from many POS SKUs (e.g. happy-hour vs.
  // regular Pub Burger, or "Burger" + "PubBurger" typo).
  canonicalId: string;
  displayName: string;
  category: string;              // custom category (may differ from POS)
  station?: string;
  posItemIds: string[];          // SKUs to merge
};

export type HiddenItem = {
  posItemId: string;
  reason: "test" | "employee_meal" | "comp" | "retired" | "other";
  hiddenAt: string;
};

export type CustomDaypart = {
  id: string;
  name: string;                  // "Brunch", "Happy Hour", "Late Night"
  daysOfWeek: number[];          // 0-6 (Sun-Sat)
  startMinute: number;           // minutes from midnight, local time
  endMinute: number;
  menuId?: string;               // optional: pin to specific Toast menu
};

export type ProductMixConfig = {
  recipeOverrides: RecipeOverride[];
  aliases: ItemAlias[];
  hidden: HiddenItem[];
  dayparts: CustomDaypart[];
};

// ----------- Adapter the backend must implement -----------

export interface POSAdapter {
  getConnection(): Promise<POSConnection>;
  triggerSync(): Promise<{ jobId: string }>;
  listMenuItems(): Promise<POSMenuItem[]>;
  getMix(range: POSRange, config: ProductMixConfig): Promise<POSMixRow[]>;
}
