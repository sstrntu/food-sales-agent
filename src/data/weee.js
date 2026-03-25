// Mock data — simulates daily scrape from Weee's hot items / top charts
// In production, this would come from a scheduled scraper or API feed

export const WEEE_SCRAPE_DATE = "2026-03-25";

// Today's hot items scraped from Weee top charts (Thai, Japanese, Snacks categories)
export const WEEE_HOT_ITEMS = [
  {
    rank: 1,
    name: "Dragonfly Biscuit Sticks, Spicy 400g",
    category: "Snacks",
    weeePrice: 4.29,
    weeklyVolume: "100+ reordered",
    trending: true,
    tags: ["SNAP", "Everyday Value"],
  },
  {
    rank: 2,
    name: "Want Want Senbei Rice Crackers 92g",
    category: "Snacks",
    weeePrice: 2.49,
    weeklyVolume: "500+ sold",
    trending: true,
    tags: ["SNAP"],
  },
  {
    rank: 3,
    name: "Amanoya Himemaru Rice Cracker 3.45oz",
    category: "Snacks",
    weeePrice: 2.79,
    weeklyVolume: "400+ sold",
    trending: false,
    tags: ["SNAP"],
  },
  {
    rank: 4,
    name: "Glico Pocky Strawberry 9P 106g",
    category: "Snacks",
    weeePrice: 3.99,
    weeklyVolume: "600+ sold",
    trending: true,
    tags: ["SNAP"],
  },
  {
    rank: 5,
    name: "Glico Pocky Chocolate 9P 117g",
    category: "Snacks",
    weeePrice: 3.79,
    weeklyVolume: "500+ sold",
    trending: true,
    tags: ["SNAP"],
  },
  {
    rank: 6,
    name: "Tasco Young Coconut Juice with Pulp 16.9 fl.oz",
    category: "Beverages",
    weeePrice: 1.79,
    weeklyVolume: "16+ weekly sold",
    trending: true,
    tags: ["SNAP", "Freshness guarantee"],
  },
  {
    rank: 7,
    name: "Dragonfly Fermented Fish Noodle Soup, Frozen 12.7oz",
    category: "Frozen",
    weeePrice: 6.99,
    weeklyVolume: "300+ sold",
    trending: false,
    tags: ["SNAP"],
  },
  {
    rank: 8,
    name: "Dragonfly Wiscuit Sticks, Spicy 400g",
    category: "Snacks",
    weeePrice: 4.29,
    weeklyVolume: "100+ sold",
    trending: false,
    tags: ["SNAP", "Everyday Value"],
  },
  {
    rank: 9,
    name: "Dragonfly Sweet Rice 5 lb",
    category: "Dry Goods",
    weeePrice: 7.49,
    weeklyVolume: "800+ sold",
    trending: true,
    tags: ["SNAP"],
  },
  {
    rank: 10,
    name: "Milk Classic Rice Snack 24 pcs 240g",
    category: "Snacks",
    weeePrice: 6.49,
    weeklyVolume: "200+ sold",
    trending: false,
    tags: ["SNAP"],
  },
];

// UST product catalog — maps to Weee items (exact match or closest alternative)
// match: "exact" = we carry the same product, "alternative" = closest UST equivalent
export const UST_CATALOG_MATCHES = [
  {
    weeeItem: "Dragonfly Biscuit Sticks, Spicy 400g",
    ustProduct: "Dragonfly Spicy Crackers 400g",
    sku: "DF-SC-400",
    ustPrice: 3.50,
    match: "exact",
    margin: "22%",
    inStock: true,
    note: "Same product, our wholesale price is lower — good margin item",
  },
  {
    weeeItem: "Want Want Senbei Rice Crackers 92g",
    ustProduct: "Want Want Senbei Rice Crackers 92g",
    sku: "WW-RC-92",
    ustPrice: 1.80,
    match: "exact",
    margin: "28%",
    inStock: true,
    note: "Exact match, strong performer across all territories",
  },
  {
    weeeItem: "Amanoya Himemaru Rice Cracker 3.45oz",
    ustProduct: "Amanoya Himemaru Rice Cracker 3.45oz",
    sku: "AM-HM-345",
    ustPrice: 2.10,
    match: "exact",
    margin: "25%",
    inStock: true,
    note: "Premium rice cracker, popular in upscale stores",
  },
  {
    weeeItem: "Glico Pocky Strawberry 9P 106g",
    ustProduct: "Glico Pocky Strawberry 9P",
    sku: "GL-PS-9P",
    ustPrice: 3.20,
    match: "exact",
    margin: "20%",
    inStock: true,
    note: "Active promo: Pocky 3-for-$10 — push this hard",
  },
  {
    weeeItem: "Glico Pocky Chocolate 9P 117g",
    ustProduct: "Glico Pocky Chocolate 9P",
    sku: "GL-PC-9P",
    ustPrice: 3.00,
    match: "exact",
    margin: "21%",
    inStock: true,
    note: "Part of Pocky promo bundle — pair with Strawberry",
  },
  {
    weeeItem: "Tasco Young Coconut Juice with Pulp 16.9 fl.oz",
    ustProduct: "Tasco Coconut Water 16oz",
    sku: "TC-CW-16",
    ustPrice: 1.25,
    match: "exact",
    margin: "30%",
    inStock: true,
    note: "Top seller across all territories — high velocity, high margin",
  },
  {
    weeeItem: "Dragonfly Fermented Fish Noodle Soup, Frozen 12.7oz",
    ustProduct: "Dragonfly Fish Noodle Soup 12.7oz",
    sku: "DF-FNS-127",
    ustPrice: 5.20,
    match: "exact",
    margin: "26%",
    inStock: true,
    note: "Frozen item, ensure stores have freezer space",
  },
  {
    weeeItem: "Dragonfly Wiscuit Sticks, Spicy 400g",
    ustProduct: "Dragonfly Spicy Crackers 400g",
    sku: "DF-SC-400",
    match: "exact",
    margin: "22%",
    ustPrice: 3.50,
    inStock: true,
    note: "Same SKU as Biscuit Sticks — variant naming on Weee",
  },
  {
    weeeItem: "Dragonfly Sweet Rice 5 lb",
    ustProduct: "Sweet Rice 5lb",
    sku: "SR-5LB",
    ustPrice: 5.80,
    match: "exact",
    margin: "23%",
    inStock: true,
    note: "Just back in stock — 6 stores were waiting for this",
  },
  {
    weeeItem: "Milk Classic Rice Snack 24 pcs 240g",
    ustProduct: "Milk Brand Rice Puffs 24ct",
    sku: "MB-RP-24",
    ustPrice: 4.90,
    match: "alternative",
    margin: "24%",
    inStock: true,
    note: "Similar product, slightly different packaging — good substitute",
  },
];

// Category benchmarks — how a store compares to peers of same tier (scenario #7)
// In production this would be computed from order data across all accounts
export const CATEGORY_BENCHMARKS = {
  A: {
    avgMonthlyOrder: 4200,
    categories: [
      { name: "Snacks", avgSpend: 680, trend: "up", trendPct: 15, note: "Driven by Pocky and Dragonfly" },
      { name: "Beverages", avgSpend: 520, trend: "up", trendPct: 12, note: "Coconut water leading" },
      { name: "Frozen", avgSpend: 440, trend: "flat", trendPct: 2, note: "Steady, no major movers" },
      { name: "Dry Goods", avgSpend: 390, trend: "up", trendPct: 8, note: "Rice and noodle staples" },
      { name: "Seasoning", avgSpend: 280, trend: "down", trendPct: -6, note: "Soy sauce reorders slowing" },
      { name: "Canned", avgSpend: 210, trend: "down", trendPct: -10, note: "Losing to frozen alternatives" },
    ],
  },
  B: {
    avgMonthlyOrder: 2600,
    categories: [
      { name: "Snacks", avgSpend: 420, trend: "up", trendPct: 18, note: "Strongest growth category" },
      { name: "Beverages", avgSpend: 310, trend: "up", trendPct: 10, note: "Tasco and Jarritos" },
      { name: "Dry Goods", avgSpend: 350, trend: "flat", trendPct: 1, note: "Rice is steady baseline" },
      { name: "Frozen", avgSpend: 280, trend: "down", trendPct: -5, note: "Limited freezer space" },
      { name: "Seasoning", avgSpend: 190, trend: "flat", trendPct: 3, note: "Small but consistent" },
      { name: "Canned", avgSpend: 150, trend: "down", trendPct: -8, note: "Shelf space shrinking" },
    ],
  },
  C: {
    avgMonthlyOrder: 1400,
    categories: [
      { name: "Snacks", avgSpend: 280, trend: "up", trendPct: 22, note: "Biggest growth opportunity" },
      { name: "Dry Goods", avgSpend: 240, trend: "flat", trendPct: 0, note: "Basics only" },
      { name: "Beverages", avgSpend: 180, trend: "up", trendPct: 8, note: "Room to grow" },
      { name: "Seasoning", avgSpend: 120, trend: "flat", trendPct: 2, note: "Minimal assortment" },
      { name: "Frozen", avgSpend: 90, trend: "down", trendPct: -12, note: "Most don't have freezers" },
      { name: "Canned", avgSpend: 80, trend: "down", trendPct: -15, note: "Declining rapidly" },
    ],
  },
};

// Helper: get today's top N hot items with UST match info
export function getHotItemsWithMatches(limit = 5) {
  return WEEE_HOT_ITEMS.slice(0, limit).map(item => {
    const match = UST_CATALOG_MATCHES.find(m => m.weeeItem === item.name);
    return { ...item, ustMatch: match || null };
  });
}
