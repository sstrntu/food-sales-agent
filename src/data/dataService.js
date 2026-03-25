// src/data/dataService.js
// Data service layer — queries Supabase tables.
// To switch back to mock data: replace each function body with the db.js version.
// All functions are async; buildRepContext assembles everything in one parallel batch.

import { supabase } from '../services/supabase';

// ─── Date Helpers ──────────────────────────────────────────────────────────────

const _today      = new Date(2026, 2, 25); // March 25, 2026
const _thisSunday = new Date(2026, 2, 29); // March 29, 2026 — end of "this week"

function daysAgoLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const days = Math.round((_today - new Date(y, m - 1, d)) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function dueDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = Math.round((date - _today) / 86400000);
  if (days <= 0) return 'Past due';
  if (days === 1) return 'Tomorrow';
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const name = names[date.getDay()];
  return date <= _thisSunday ? `This ${name}` : `Next ${name}`;
}

// ─── Context Builder ───────────────────────────────────────────────────────────
// Single function — fires 11 Supabase queries in parallel, assembles rep context.
// Returns the same shape as the old mock REPS object (no UI changes needed).

export async function buildRepContext(repId) {
  const [
    { data: profile,       error: e1 },
    { data: target,        error: e2 },
    { data: snapshot,      error: e3 },
    { data: rawAccounts,   error: e4 },
    { data: invoices,      error: e5 },
    { data: velocity,      error: e6 },
    { data: trending,      error: e7 },
    { data: backInStock,   error: e8 },
    { data: promoAssigns,  error: e9 },
    { data: promos,        error: e10 },
    { data: products,      error: e11 },
  ] = await Promise.all([
    supabase.from('rep_profiles').select('*').eq('id', repId).single(),
    supabase.from('sales_targets').select('*').eq('rep_id', repId).eq('month', '2026-03').single(),
    supabase.from('sales_snapshots').select('*').eq('rep_id', repId).single(),
    supabase.from('accounts').select('*').eq('rep_id', repId),
    supabase.from('invoices').select('*').eq('rep_id', repId),
    supabase.from('product_velocity').select('*').eq('rep_id', repId),
    supabase.from('trending_products').select('*').eq('rep_id', repId),
    supabase.from('back_in_stock_demand').select('*').eq('rep_id', repId),
    supabase.from('promo_rep_assignments').select('*').eq('rep_id', repId),
    supabase.from('promotions').select('*'),
    supabase.from('products').select('*'),
  ]);

  const errors = [e1,e2,e3,e4,e5,e6,e7,e8,e9,e10,e11].filter(Boolean);
  if (errors.length) throw new Error(`Supabase query error: ${errors[0].message}`);

  // ── Accounts: derive AR status from invoice records ────────────────────────
  const accounts = rawAccounts.map(a => {
    const acctInvoices = invoices.filter(i => i.account_id === a.id);
    const overdueList  = acctInvoices.filter(i => i.status === 'overdue');
    const flaggedList  = acctInvoices.filter(i => i.status === 'flagged');
    const pendingList  = acctInvoices.filter(i => i.status === 'pending');

    let arStatus = 'current';
    if (flaggedList.length > 0)  arStatus = 'flagged';
    else if (overdueList.length > 0) arStatus = 'overdue';

    return {
      name:           a.name,
      tier:           a.tier,
      avgOrder:       a.avg_order,
      ownerName:      a.owner_name,
      paymentHistory: a.payment_history,
      lastOrder:      daysAgoLabel(a.last_order_date),
      arStatus,
      ...(overdueList.length > 0 && {
        daysPastDue:   overdueList[0].days_past_due,
        overdueAmount: overdueList.reduce((s, i) => s + Number(i.amount), 0),
      }),
      ...(flaggedList.length > 0 && {
        overdueInvoices:  flaggedList.length,
        totalOutstanding: flaggedList.reduce((s, i) => s + Number(i.amount), 0),
      }),
      ...(pendingList.length > 0 && {
        invoiceDue:    dueDateLabel(pendingList[0].due_date),
        invoiceAmount: Number(pendingList[0].amount),
      }),
    };
  });

  // ── Top sellers: join velocity with products ───────────────────────────────
  const topSellers = [...velocity]
    .sort((a, b) => b.reorder_count - a.reorder_count)
    .map(v => {
      const p = products.find(p => p.id === v.product_id);
      return { name: p.name, velocity: v.velocity, reorders: v.reorder_count, period: v.period };
    });

  // ── Trending items ─────────────────────────────────────────────────────────
  const trendingItems = trending.map(t => {
    const p = products.find(p => p.id === t.product_id);
    return { name: p.name, growth: t.growth, note: t.note };
  });

  // ── Back in stock ──────────────────────────────────────────────────────────
  const backInStockItems = backInStock.map(b => {
    const p = products.find(p => p.id === b.product_id);
    return { name: p.name, storesWaiting: b.stores_waiting, note: b.note };
  });

  // ── Promos ─────────────────────────────────────────────────────────────────
  const activePromos = promoAssigns.map(pa => {
    const promo = promos.find(p => p.id === pa.promo_id);
    return {
      name:             promo.name,
      endDate:          dueDateLabel(promo.end_date),
      storesNotOrdered: pa.stores_not_ordered,
      dollarOpportunity: Number(pa.dollar_opportunity),
    };
  });

  // ── Assemble — same shape as old REPS[repId] ──────────────────────────────
  return {
    id:               repId,
    name:             profile.name,
    avatar:           profile.avatar,
    territory:        profile.territory,
    monthlyTarget:    Number(target.monthly_target),
    weeklyTarget:     Number(target.weekly_target),
    mtdSales:         Number(snapshot.mtd_sales),
    priorDaySales:    Number(snapshot.prior_day_sales),
    priorWeekSales:   Number(snapshot.prior_week_sales),
    avgOrderSize:     Number(snapshot.avg_order_size),
    businessDaysLeft:  profile.business_days_left,
    businessDaysTotal: profile.business_days_total,
    accounts,
    topSellers,
    trendingItems,
    backInStock: backInStockItems,
    promos: activePromos,
  };
}

// ─── Load all reps ─────────────────────────────────────────────────────────────
export async function loadReps() {
  const [jimmy, maria, derek] = await Promise.all([
    buildRepContext('jimmy'),
    buildRepContext('maria'),
    buildRepContext('derek'),
  ]);
  return { jimmy, maria, derek };
}
