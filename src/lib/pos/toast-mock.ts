// Mock Toast adapter — UI uses this until Claude wires the real
// backend (Toast Orders + Menus API → sync job → DB) behind the
// same `POSAdapter` interface.

import type {
  POSAdapter,
  POSConnection,
  POSMenuItem,
  POSMixRow,
  POSRange,
  ProductMixConfig,
} from "./types";

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
const ahead = (mins: number) => new Date(now.getTime() + mins * 60_000).toISOString();

export const toastMock: POSAdapter = {
  async getConnection(): Promise<POSConnection> {
    return {
      provider: "toast",
      restaurantGuid: "tg_demo_thrashers",
      locationName: "Thrasher's Pub — Main",
      status: "connected",
      lastSyncAt: ago(3),
      nextSyncAt: ahead(2),
      refreshIntervalSec: 300,
    };
  },

  async triggerSync() {
    return { jobId: `sync_${Date.now()}` };
  },

  async listMenuItems(): Promise<POSMenuItem[]> {
    return [
      { posItemId: "tst_001", posItemName: "PubBurger", posCategoryName: "Sandwiches", posPrice: 18, posCost: 5.2 },
      { posItemId: "tst_002", posItemName: "Pub Burger", posCategoryName: "Sandwiches", posPrice: 18, posCost: 5.2 },
      { posItemId: "tst_010", posItemName: "Wings 10pc", posCategoryName: "Apps", posPrice: 16, posCost: 4.1 },
      { posItemId: "tst_023", posItemName: "Guinness 16oz", posCategoryName: "Draft", posPrice: 9, posCost: 1.8 },
      { posItemId: "tst_099", posItemName: "Employee Meal", posCategoryName: "Internal", posPrice: 0 },
    ];
  },

  async getMix(_range: POSRange, _config: ProductMixConfig): Promise<POSMixRow[]> {
    // Mock — backend will compute this from Orders API + config.
    return [];
  },
};
