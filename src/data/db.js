// src/data/db.js
// Normalized mock tables — mirrors production DB schema (see ARCHITECTURE.md)
// In production: each table would be a backend API endpoint or DB query result
// Swap dataService.js implementations to connect to real ERP/CRM without touching UI

export const TODAY_STR = "2026-03-25";

// ─── Sales Reps ────────────────────────────────────────────────────────────────
export const REP_PROFILES = [
  { id: "jimmy", name: "Jimmy Tran",   avatar: "JT", territory: "East Bay",     businessDaysLeft: 10, businessDaysTotal: 22 },
  { id: "maria", name: "Maria Santos", avatar: "MS", territory: "South Bay",    businessDaysLeft: 10, businessDaysTotal: 22 },
  { id: "derek", name: "Derek Huang",  avatar: "DH", territory: "SF Peninsula", businessDaysLeft: 10, businessDaysTotal: 22 },
];

// ─── Sales Targets (per rep, per month) ────────────────────────────────────────
export const SALES_TARGETS = [
  { repId: "jimmy", month: "2026-03", monthlyTarget: 72000, weeklyTarget: 18000 },
  { repId: "maria", month: "2026-03", monthlyTarget: 85000, weeklyTarget: 21250 },
  { repId: "derek", month: "2026-03", monthlyTarget: 68000, weeklyTarget: 17000 },
];

// ─── Sales Performance Snapshots ───────────────────────────────────────────────
// Pre-aggregated daily snapshot — in production this would be a materialized view
// computed from the orders table (SUM by rep, date range, status != cancelled)
export const SALES_SNAPSHOTS = [
  { repId: "jimmy", asOf: "2026-03-25", mtdSales: 48200, priorDaySales: 3100, priorWeekSales: 15800, avgOrderSize: 850 },
  { repId: "maria", asOf: "2026-03-25", mtdSales: 71500, priorDaySales: 4200, priorWeekSales: 22100, avgOrderSize: 960 },
  { repId: "derek", asOf: "2026-03-25", mtdSales: 29800, priorDaySales: 1400, priorWeekSales: 11200, avgOrderSize: 720 },
];

// ─── Accounts ──────────────────────────────────────────────────────────────────
// Each account belongs to a rep (rep_id FK). lastOrderDate drives "X days ago" display.
export const ACCOUNTS = [
  // Jimmy — East Bay
  { id: "jmy-01", repId: "jimmy", name: "Lucky Supermarket",    tier: "A", avgOrder: 920,  lastOrderDate: "2026-03-22", ownerName: null,           paymentHistory: "Usually on time" },
  { id: "jmy-02", repId: "jimmy", name: "Golden Dragon Market", tier: "A", avgOrder: 780,  lastOrderDate: "2026-03-13", ownerName: "Mr. Chen",      paymentHistory: "Normally reliable" },
  { id: "jmy-03", repId: "jimmy", name: "Star Market",          tier: "B", avgOrder: 650,  lastOrderDate: "2026-03-20", ownerName: null,           paymentHistory: null },
  { id: "jmy-04", repId: "jimmy", name: "Happy Market",         tier: "A", avgOrder: 1240, lastOrderDate: "2026-03-24", ownerName: null,           paymentHistory: null },
  { id: "jmy-05", repId: "jimmy", name: "Pacific Foods",        tier: "B", avgOrder: 560,  lastOrderDate: "2026-03-17", ownerName: null,           paymentHistory: null },
  { id: "jmy-06", repId: "jimmy", name: "Asian Best Grocery",   tier: "A", avgOrder: 730,  lastOrderDate: "2026-03-21", ownerName: null,           paymentHistory: null },
  { id: "jmy-07", repId: "jimmy", name: "Sunrise Mart",         tier: "C", avgOrder: 480,  lastOrderDate: "2026-03-10", ownerName: null,           paymentHistory: null },
  { id: "jmy-08", repId: "jimmy", name: "Ocean View Market",    tier: "A", avgOrder: 910,  lastOrderDate: "2026-03-23", ownerName: null,           paymentHistory: null },
  { id: "jmy-09", repId: "jimmy", name: "Green Leaf Foods",     tier: "C", avgOrder: 390,  lastOrderDate: "2026-03-05", ownerName: null,           paymentHistory: "Sometimes late" },
  { id: "jmy-10", repId: "jimmy", name: "East Bay Provisions",  tier: "A", avgOrder: 1050, lastOrderDate: "2026-03-19", ownerName: null,           paymentHistory: null },
  { id: "jmy-11", repId: "jimmy", name: "Pho Hoa Grocery",      tier: "B", avgOrder: 670,  lastOrderDate: "2026-03-16", ownerName: null,           paymentHistory: null },
  { id: "jmy-12", repId: "jimmy", name: "Ming's Market",        tier: "B", avgOrder: 820,  lastOrderDate: "2026-03-22", ownerName: null,           paymentHistory: null },
  // Maria — South Bay
  { id: "mra-01", repId: "maria", name: "Mercado Latino",       tier: "A", avgOrder: 1100, lastOrderDate: "2026-03-24", ownerName: null,           paymentHistory: null },
  { id: "mra-02", repId: "maria", name: "Fiesta Market",        tier: "A", avgOrder: 880,  lastOrderDate: "2026-03-21", ownerName: null,           paymentHistory: "Always on time" },
  { id: "mra-03", repId: "maria", name: "Casa Fresh",           tier: "B", avgOrder: 750,  lastOrderDate: "2026-03-18", ownerName: "Mrs. Rodriguez", paymentHistory: "Occasionally late" },
  { id: "mra-04", repId: "maria", name: "El Sol Grocery",       tier: "A", avgOrder: 1350, lastOrderDate: "2026-03-23", ownerName: null,           paymentHistory: null },
  { id: "mra-05", repId: "maria", name: "Tropical Mart",        tier: "B", avgOrder: 620,  lastOrderDate: "2026-03-15", ownerName: null,           paymentHistory: null },
  { id: "mra-06", repId: "maria", name: "La Palma Foods",       tier: "A", avgOrder: 940,  lastOrderDate: "2026-03-22", ownerName: null,           paymentHistory: null },
  { id: "mra-07", repId: "maria", name: "South Valley Market",  tier: "C", avgOrder: 580,  lastOrderDate: "2026-03-19", ownerName: null,           paymentHistory: null },
  { id: "mra-08", repId: "maria", name: "Sabor Market",         tier: "A", avgOrder: 1200, lastOrderDate: "2026-03-24", ownerName: null,           paymentHistory: null },
  { id: "mra-09", repId: "maria", name: "Fresh & Green",        tier: "C", avgOrder: 430,  lastOrderDate: "2026-03-11", ownerName: null,           paymentHistory: null },
  { id: "mra-10", repId: "maria", name: "Plaza Foods",          tier: "A", avgOrder: 870,  lastOrderDate: "2026-03-20", ownerName: null,           paymentHistory: null },
  // Derek — SF Peninsula
  { id: "drk-01", repId: "derek", name: "Sunset Grocery",       tier: "B", avgOrder: 680,  lastOrderDate: "2026-03-19", ownerName: null,           paymentHistory: null },
  { id: "drk-02", repId: "derek", name: "Richmond Market",      tier: "B", avgOrder: 540,  lastOrderDate: "2026-03-14", ownerName: "Mr. Wong",     paymentHistory: "Has been late before" },
  { id: "drk-03", repId: "derek", name: "Bay Seafood Market",   tier: "A", avgOrder: 920,  lastOrderDate: "2026-03-22", ownerName: null,           paymentHistory: "Reliable" },
  { id: "drk-04", repId: "derek", name: "New China Market",     tier: "B", avgOrder: 610,  lastOrderDate: "2026-03-17", ownerName: null,           paymentHistory: null },
  { id: "drk-05", repId: "derek", name: "Peninsula Foods",      tier: "A", avgOrder: 1080, lastOrderDate: "2026-03-23", ownerName: null,           paymentHistory: null },
  { id: "drk-06", repId: "derek", name: "Clement St. Grocery",  tier: "C", avgOrder: 390,  lastOrderDate: "2026-03-07", ownerName: null,           paymentHistory: null },
  { id: "drk-07", repId: "derek", name: "Daly City Market",     tier: "A", avgOrder: 750,  lastOrderDate: "2026-03-21", ownerName: null,           paymentHistory: null },
  { id: "drk-08", repId: "derek", name: "SSF Asian Mart",       tier: "A", avgOrder: 830,  lastOrderDate: "2026-03-18", ownerName: null,           paymentHistory: null },
  { id: "drk-09", repId: "derek", name: "Westlake Foods",       tier: "C", avgOrder: 470,  lastOrderDate: "2026-03-12", ownerName: null,           paymentHistory: null },
];

// ─── Invoices ──────────────────────────────────────────────────────────────────
// AR status is derived by querying this table (overdue = past due_date, unpaid;
// flagged = multiple overdue invoices blocked from new orders; pending = upcoming)
// In production: full invoice history lives here, AR status is computed not stored
export const INVOICES = [
  // Jimmy
  { id: "inv-jmy-01",  accountId: "jmy-01", repId: "jimmy", amount: 870,  issuedDate: "2026-03-22", dueDate: "2026-03-27", status: "pending"  }, // This Friday
  { id: "inv-jmy-02",  accountId: "jmy-02", repId: "jimmy", amount: 1450, issuedDate: "2026-03-07", dueDate: "2026-03-07", status: "overdue",  daysPastDue: 18 },
  { id: "inv-jmy-03a", accountId: "jmy-03", repId: "jimmy", amount: 980,  issuedDate: "2026-03-01", dueDate: "2026-03-08", status: "flagged"   },
  { id: "inv-jmy-03b", accountId: "jmy-03", repId: "jimmy", amount: 1120, issuedDate: "2026-03-10", dueDate: "2026-03-17", status: "flagged"   },
  { id: "inv-jmy-09",  accountId: "jmy-09", repId: "jimmy", amount: 620,  issuedDate: "2026-03-18", dueDate: "2026-03-18", status: "overdue",  daysPastDue: 7 },
  // Maria
  { id: "inv-mra-02",  accountId: "mra-02", repId: "maria", amount: 1320, issuedDate: "2026-03-21", dueDate: "2026-03-30", status: "pending"  }, // Next Monday
  { id: "inv-mra-03",  accountId: "mra-03", repId: "maria", amount: 980,  issuedDate: "2026-03-13", dueDate: "2026-03-13", status: "overdue",  daysPastDue: 12 },
  { id: "inv-mra-07a", accountId: "mra-07", repId: "maria", amount: 620,  issuedDate: "2026-03-01", dueDate: "2026-03-08", status: "flagged"   },
  { id: "inv-mra-07b", accountId: "mra-07", repId: "maria", amount: 1140, issuedDate: "2026-03-08", dueDate: "2026-03-15", status: "flagged"   },
  { id: "inv-mra-07c", accountId: "mra-07", repId: "maria", amount: 1040, issuedDate: "2026-03-15", dueDate: "2026-03-22", status: "flagged"   },
  // Derek
  { id: "inv-drk-03",  accountId: "drk-03", repId: "derek", amount: 1150, issuedDate: "2026-03-22", dueDate: "2026-03-26", status: "pending"  }, // Tomorrow
  { id: "inv-drk-02",  accountId: "drk-02", repId: "derek", amount: 1890, issuedDate: "2026-02-28", dueDate: "2026-02-28", status: "overdue",  daysPastDue: 25 },
  { id: "inv-drk-06",  accountId: "drk-06", repId: "derek", amount: 950,  issuedDate: "2026-03-07", dueDate: "2026-03-14", status: "flagged"   },
];

// ─── Products (UST Catalog) ────────────────────────────────────────────────────
// status: "active" | "back_in_stock" | "discontinued"
export const PRODUCTS = [
  { id: "prod-001", name: "Tasco Coconut Water 16oz",        sku: "TC-CW-16",  category: "Beverages",  unitPrice: 1.25, status: "active" },
  { id: "prod-002", name: "Kikkoman Soy Sauce 1.6L",         sku: "KK-SS-16",  category: "Seasoning",  unitPrice: 4.50, status: "active" },
  { id: "prod-003", name: "Nongshim Shin Ramyun 4pk",        sku: "NS-SR-4P",  category: "Dry Goods",  unitPrice: 5.20, status: "active" },
  { id: "prod-004", name: "Dragonfly Spicy Crackers 400g",   sku: "DF-SC-400", category: "Snacks",     unitPrice: 3.50, status: "active" },
  { id: "prod-005", name: "Matcha Latte Mix 10pk",           sku: "ML-MX-10",  category: "Beverages",  unitPrice: 6.80, status: "active" },
  { id: "prod-006", name: "Sweet Rice 5lb",                  sku: "SR-5LB",    category: "Dry Goods",  unitPrice: 5.80, status: "back_in_stock" },
  { id: "prod-007", name: "Pandan Extract 4oz",              sku: "PE-4OZ",    category: "Seasoning",  unitPrice: 2.40, status: "back_in_stock" },
  { id: "prod-008", name: "Jarritos Variety 12pk",           sku: "JR-V-12",   category: "Beverages",  unitPrice: 8.50, status: "active" },
  { id: "prod-009", name: "Maseca Corn Flour 4lb",           sku: "MA-CF-4",   category: "Dry Goods",  unitPrice: 3.20, status: "active" },
  { id: "prod-010", name: "Tajin Seasoning 14oz",            sku: "TJ-14",     category: "Seasoning",  unitPrice: 2.90, status: "active" },
  { id: "prod-011", name: "Chamoy Sauce 12oz",               sku: "CH-12",     category: "Seasoning",  unitPrice: 3.10, status: "active" },
  { id: "prod-012", name: "Takis Fuego Party Size",          sku: "TK-FP",     category: "Snacks",     unitPrice: 5.50, status: "active" },
  { id: "prod-013", name: "Valentina Hot Sauce 1L",          sku: "VL-1L",     category: "Seasoning",  unitPrice: 4.20, status: "back_in_stock" },
  { id: "prod-014", name: "Abuelita Chocolate Tablets",      sku: "AB-CT",     category: "Dry Goods",  unitPrice: 3.80, status: "back_in_stock" },
  { id: "prod-015", name: "Lee Kum Kee Oyster Sauce",        sku: "LKK-OS",    category: "Seasoning",  unitPrice: 3.60, status: "active" },
  { id: "prod-016", name: "Wei-Chuan Dumpling Wrappers",     sku: "WC-DW",     category: "Frozen",     unitPrice: 2.80, status: "active" },
  { id: "prod-017", name: "Huy Fong Sriracha 17oz",          sku: "HF-SR-17",  category: "Seasoning",  unitPrice: 3.10, status: "active" },
  { id: "prod-018", name: "Yuzu Ponzu Sauce 10oz",           sku: "YP-10",     category: "Seasoning",  unitPrice: 4.20, status: "active" },
  { id: "prod-019", name: "Frozen Xiao Long Bao 12ct",       sku: "XLB-12",    category: "Frozen",     unitPrice: 7.50, status: "active" },
  { id: "prod-020", name: "Lao Gan Ma Chili Crisp",          sku: "LGM-CC",    category: "Seasoning",  unitPrice: 3.80, status: "back_in_stock" },
  { id: "prod-021", name: "Indomie Mi Goreng 5pk",           sku: "IN-MG-5",   category: "Dry Goods",  unitPrice: 4.20, status: "back_in_stock" },
  { id: "prod-022", name: "Glico Pocky Strawberry 9P",       sku: "GL-PS-9P",  category: "Snacks",     unitPrice: 3.20, status: "active" },
  { id: "prod-023", name: "Glico Pocky Chocolate 9P",        sku: "GL-PC-9P",  category: "Snacks",     unitPrice: 3.00, status: "active" },
];

// ─── Promotions ────────────────────────────────────────────────────────────────
export const PROMOTIONS = [
  { id: "promo-001", name: "Pocky 3-for-$10",              endDate: "2026-03-29" },
  { id: "promo-002", name: "Rice Paper Buy 2 Get 1",       endDate: "2026-04-01" },
  { id: "promo-003", name: "Modelo 24pk $18.99",           endDate: "2026-03-28" },
  { id: "promo-004", name: "Goya Beans Buy 3 Save $2",     endDate: "2026-04-03" },
  { id: "promo-005", name: "Cup Noodle Variety 6pk $5.99", endDate: "2026-04-02" },
];

// ─── Promo–Rep Assignments ──────────────────────────────────────────────────────
// Tracks which promo is active for which rep's territory, with pre-computed
// opportunity metrics (in production: derived from order data and promo targets)
export const PROMO_REP_ASSIGNMENTS = [
  { promoId: "promo-001", repId: "jimmy", storesNotOrdered: 8,  dollarOpportunity: 1200 },
  { promoId: "promo-002", repId: "jimmy", storesNotOrdered: 5,  dollarOpportunity: 750  },
  { promoId: "promo-003", repId: "maria", storesNotOrdered: 6,  dollarOpportunity: 2280 },
  { promoId: "promo-004", repId: "maria", storesNotOrdered: 9,  dollarOpportunity: 890  },
  { promoId: "promo-001", repId: "derek", storesNotOrdered: 11, dollarOpportunity: 1650 },
  { promoId: "promo-005", repId: "derek", storesNotOrdered: 7,  dollarOpportunity: 1050 },
];

// ─── Product Velocity (rolling 2-week reorder analysis) ────────────────────────
// In production: COUNT(order_items) GROUP BY product WHERE order_date >= NOW()-14d
export const PRODUCT_VELOCITY = [
  { repId: "jimmy", productId: "prod-001", reorderCount: 7, period: "2 weeks", velocity: "high"   },
  { repId: "jimmy", productId: "prod-002", reorderCount: 5, period: "2 weeks", velocity: "high"   },
  { repId: "jimmy", productId: "prod-003", reorderCount: 4, period: "2 weeks", velocity: "medium" },
  { repId: "maria", productId: "prod-008", reorderCount: 9, period: "2 weeks", velocity: "high"   },
  { repId: "maria", productId: "prod-009", reorderCount: 6, period: "2 weeks", velocity: "high"   },
  { repId: "maria", productId: "prod-010", reorderCount: 5, period: "2 weeks", velocity: "medium" },
  { repId: "derek", productId: "prod-015", reorderCount: 6, period: "2 weeks", velocity: "high"   },
  { repId: "derek", productId: "prod-016", reorderCount: 5, period: "2 weeks", velocity: "high"   },
  { repId: "derek", productId: "prod-017", reorderCount: 4, period: "2 weeks", velocity: "medium" },
];

// ─── Trending Products (growth signals vs prior period) ────────────────────────
// In production: computed from order_items comparing current vs prior 2-week window
export const TRENDING_PRODUCTS = [
  { repId: "jimmy", productId: "prod-004", growth: "30%", note: "New packaging, up in similar accounts" },
  { repId: "jimmy", productId: "prod-005", growth: "25%", note: "Trending across Bay Area stores" },
  { repId: "maria", productId: "prod-011", growth: "40%", note: "Viral on social media, huge demand" },
  { repId: "maria", productId: "prod-012", growth: "22%", note: "Summer snacking season pickup" },
  { repId: "derek", productId: "prod-018", growth: "35%", note: "Restaurant-quality at home trend" },
  { repId: "derek", productId: "prod-019", growth: "28%", note: "TikTok viral item this month" },
];

// ─── Back In Stock Demand ──────────────────────────────────────────────────────
// Tracks which products have demand pent up while out of stock, per rep territory
// In production: derived from lost-order signals and restock notifications
export const BACK_IN_STOCK_DEMAND = [
  { repId: "jimmy", productId: "prod-006", storesWaiting: 6, note: "6 stores bought it before it sold out" },
  { repId: "jimmy", productId: "prod-007", storesWaiting: 3, note: "Popular in baking season" },
  { repId: "maria", productId: "prod-013", storesWaiting: 8, note: "Was out for 3 weeks, high demand" },
  { repId: "maria", productId: "prod-014", storesWaiting: 4, note: "Seasonal favorite" },
  { repId: "derek", productId: "prod-020", storesWaiting: 7, note: "The most requested restock item" },
  { repId: "derek", productId: "prod-021", storesWaiting: 5, note: "Was out for 2 weeks" },
];
