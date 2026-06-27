// Derives current unit cost and weekly usage for inventory items from
// "vendor data" (recent invoice line items) and "product mix" (menu items
// that consume each inventory unit). Today these series are generated
// deterministically from each item's id + seed values so the numbers stay
// stable across renders and can be swapped for live data later.

export type InvoiceLine = {
  date: string; // ISO yyyy-mm-dd
  vendor: string;
  unitPrice: number;
  qty: number;
  invoiceNo: string;
};

export type MixWeek = {
  week: string; // e.g. "W23"
  menuItem: string;
  sold: number; // menu units sold that week
  yieldPerSale: number; // inventory units consumed per menu sale
  inventoryUnits: number; // sold * yieldPerSale
};

export type Derived = {
  cost: number;
  weeklyUsage: number;
  invoices: InvoiceLine[];
  mix: MixWeek[];
  menuItems: string[]; // distinct menu items that drive usage
  costDeltaPct: number; // vs. oldest invoice in window
  usageDeltaPct: number; // vs. oldest week in window
};

// Menu items per inventory item. Falls back to category-based defaults.
const MENU_LINKS: Record<string, Array<{ name: string; yield: number }>> = {
  "a1": [{ name: "Moscow Mule", yield: 0.06 }, { name: "Vodka Soda", yield: 0.06 }, { name: "Espresso Martini", yield: 0.08 }],
  "a2": [{ name: "Jameson Neat", yield: 0.06 }, { name: "Irish Coffee", yield: 0.06 }],
  "a3": [{ name: "Don Julio Margarita", yield: 0.07 }, { name: "Tequila Shot", yield: 0.05 }],
  "a4": [{ name: "Old Fashioned", yield: 0.06 }, { name: "Bourbon Sour", yield: 0.07 }],
  "a5": [{ name: "Guinness Pint", yield: 0.05 }],
  "a6": [{ name: "Stella Pint", yield: 0.05 }],
  "a7": [{ name: "Modelo Bottle", yield: 0.042 }],
  "b1": [{ name: "Fountain Coke", yield: 0.015 }, { name: "Rum & Coke", yield: 0.01 }],
  "b2": [{ name: "Fountain Diet Coke", yield: 0.015 }],
  "b3": [{ name: "Fountain Sprite", yield: 0.015 }],
  "b4": [{ name: "Cosmopolitan", yield: 0.04 }, { name: "Cape Codder", yield: 0.06 }],
  "b5": [{ name: "Margarita", yield: 0.02 }, { name: "Mojito", yield: 0.025 }, { name: "Whiskey Sour", yield: 0.02 }],
  "f1": [{ name: "Pub Burger", yield: 0.5 }, { name: "Beef Chili", yield: 0.4 }],
  "f2": [{ name: "Wings (10pc)", yield: 1.3 }, { name: "Wings (6pc)", yield: 0.8 }],
  "f3": [{ name: "Hand-cut Fries", yield: 0.6 }, { name: "Loaded Fries", yield: 0.7 }],
  "f4": [{ name: "Pub Burger", yield: 1 }, { name: "Chicken Sandwich", yield: 1 }],
  "f5": [{ name: "Pub Burger", yield: 0.12 }, { name: "Grilled Cheese", yield: 0.18 }],
  "f6": [{ name: "Caesar Salad", yield: 0.25 }, { name: "BLT Wrap", yield: 0.15 }],
};

const CATEGORY_DEFAULTS: Record<string, Array<{ name: string; yield: number }>> = {
  Alcohol: [{ name: "Mixed drinks", yield: 0.06 }],
  Beverages: [{ name: "Fountain & cocktails", yield: 0.02 }],
  Food: [{ name: "Kitchen line", yield: 0.4 }],
  "Dry Goods": [{ name: "Kitchen prep", yield: 0.05 }],
  Miscellaneous: [{ name: "FOH operations", yield: 0.05 }],
};

// Deterministic pseudo-random in [0,1) from a string seed.
function hash01(seed: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

const WEEKS = ["W22", "W23", "W24", "W25"];

function isoDateOffset(daysAgo: number): string {
  const d = new Date(2026, 5, 27); // anchored to current project date
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function deriveItem(input: {
  id: string;
  category: string;
  vendor: string;
  unit: string;
  seedCost: number;
  seedUsage: number;
}): Derived {
  const { id, category, vendor, seedCost, seedUsage } = input;

  // --- Invoice price series (3 most recent receipts from vendor) ---
  // Walk back: oldest first slightly lower, current most recent.
  const invoices: InvoiceLine[] = [0, 1, 2].map((i) => {
    // Variation: oldest ~ -3% to -7%, mid ~ -1% to +2%, latest = seed
    const variance =
      i === 0
        ? -(0.03 + hash01(id, 11) * 0.04)
        : i === 1
          ? -0.01 + hash01(id, 22) * 0.03
          : 0;
    const unitPrice = +(seedCost * (1 + variance)).toFixed(2);
    const daysAgo = [42, 21, 7][i];
    const qty = Math.max(1, Math.round(seedUsage * (1 + hash01(id, 33 + i) * 0.4)));
    return {
      date: isoDateOffset(daysAgo),
      vendor,
      unitPrice,
      qty,
      invoiceNo: `INV-${id.toUpperCase()}-${1000 + i}`,
    };
  });
  const cost = invoices[invoices.length - 1].unitPrice;
  const oldestCost = invoices[0].unitPrice;
  const costDeltaPct = ((cost - oldestCost) / oldestCost) * 100;

  // --- Product mix series (4 most recent weeks) ---
  const links = MENU_LINKS[id] ?? CATEGORY_DEFAULTS[category] ?? [{ name: "Menu items", yield: 0.1 }];
  // Distribute seedUsage across menu items as a target, then jitter weekly.
  const baseUnitsPerWeek = seedUsage;

  const mix: MixWeek[] = [];
  WEEKS.forEach((week, wi) => {
    // Weekly target with small trend & noise
    const trend = 0.95 + wi * 0.025; // gentle upward trend
    const noise = 0.9 + hash01(id, 100 + wi) * 0.2;
    const weekTarget = baseUnitsPerWeek * trend * noise;
    // Split across menu items by yield weighting
    const totalYield = links.reduce((s, l) => s + l.yield, 0);
    links.forEach((link, li) => {
      const share = link.yield / totalYield;
      const inventoryUnits = +(weekTarget * share).toFixed(2);
      const sold = Math.max(1, Math.round(inventoryUnits / link.yield));
      mix.push({
        week,
        menuItem: link.name,
        sold,
        yieldPerSale: link.yield,
        inventoryUnits,
      });
    });
  });

  // Aggregate per week → average
  const weeklyTotals = WEEKS.map((w) =>
    mix.filter((m) => m.week === w).reduce((s, m) => s + m.inventoryUnits, 0)
  );
  const weeklyUsage = +(
    weeklyTotals.reduce((s, n) => s + n, 0) / weeklyTotals.length
  ).toFixed(1);
  const oldestWeek = weeklyTotals[0] || 1;
  const usageDeltaPct = ((weeklyTotals[weeklyTotals.length - 1] - oldestWeek) / oldestWeek) * 100;

  return {
    cost,
    weeklyUsage,
    invoices,
    mix,
    menuItems: links.map((l) => l.name),
    costDeltaPct,
    usageDeltaPct,
  };
}
