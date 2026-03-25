import React from 'react';
import { getHotItemsWithMatches, CATEGORY_BENCHMARKS, WEEE_SCRAPE_DATE } from '../data/weee';

export default function Dashboard({ rep }) {
  const gap = rep.monthlyTarget - rep.mtdSales;
  const pct = Math.round((rep.mtdSales / rep.monthlyTarget) * 100);
  const dailyNeeded = Math.round(gap / rep.businessDaysLeft);
  const overdue = rep.accounts.filter(a => a.arStatus === "overdue");
  const flagged = rep.accounts.filter(a => a.arStatus === "flagged");
  const hotItems = getHotItemsWithMatches(5);

  return (
    <div className="dash-scroll">
      {/* Target Card */}
      <div className="card">
        <div className="card-title">Sales Target</div>
        <div className="card-row" style={{ marginTop: 12 }}>
          <div>
            <div className="card-big-num">${(rep.mtdSales / 1000).toFixed(1)}k</div>
            <div className="card-sub">of ${(rep.monthlyTarget / 1000).toFixed(0)}k target</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={`card-big-num ${pct >= 75 ? 'c-green' : pct >= 50 ? 'c-yellow' : 'c-red'}`}>
              {pct}%
            </div>
            <div className="card-sub">~${dailyNeeded.toLocaleString()}/day needed</div>
          </div>
        </div>
      </div>

      {/* AR Summary */}
      <div className="card">
        <div className="card-title">Accounts Receivable</div>
        <div style={{ marginTop: 10 }}>
          {overdue.length === 0 && flagged.length === 0 && (
            <div className="card-sub">All accounts current</div>
          )}
          {overdue.map((a, i) => (
            <div key={i} className="ar-row">
              <div className="ar-dot" style={{ background: '#dba54e' }} />
              <div className="ar-info">
                <div className="ar-name">{a.name}</div>
                <div className="ar-detail">{a.daysPastDue}d overdue &middot; ${a.overdueAmount}</div>
              </div>
            </div>
          ))}
          {flagged.map((a, i) => (
            <div key={i} className="ar-row">
              <div className="ar-dot" style={{ background: '#d46b6b' }} />
              <div className="ar-info">
                <div className="ar-name">{a.name}</div>
                <div className="ar-detail">Flagged &middot; ${a.totalOutstanding} outstanding</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promos */}
      <div className="card">
        <div className="card-title">Active Promos</div>
        {rep.promos.map((p, i) => (
          <div key={i} className="ar-row" style={{ marginTop: i === 0 ? 10 : 0 }}>
            <div className="ar-info">
              <div className="ar-name">{p.name}</div>
              <div className="ar-detail">
                Ends {p.endDate} &middot; {p.storesNotOrdered} stores left &middot; ${p.dollarOpportunity}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Accounts */}
      <div className="card">
        <div className="card-title">Accounts ({rep.accounts.length})</div>
        {rep.accounts.slice(0, 8).map((a, i) => (
          <div key={i} className="ar-row" style={{ marginTop: i === 0 ? 10 : 0 }}>
            <div className="tier-badge">{a.tier}</div>
            <div className="ar-info">
              <div className="ar-name">{a.name}</div>
              <div className="ar-detail">Avg ${a.avgOrder} &middot; Last {a.lastOrder}</div>
            </div>
            <div className={`ar-status ${a.arStatus === 'current' ? 'c-green' : a.arStatus === 'overdue' ? 'c-yellow' : 'c-red'}`}>
              {a.arStatus}
            </div>
          </div>
        ))}
      </div>

      {/* Weee Hot Items */}
      <div className="card">
        <div className="card-title">
          Weee Hot Items
          <span className="card-sub" style={{ marginLeft: 8, fontWeight: 400 }}>
            {WEEE_SCRAPE_DATE}
          </span>
        </div>
        {hotItems.map((item, i) => (
          <div key={i} className="ar-row" style={{ marginTop: i === 0 ? 10 : 0, alignItems: 'flex-start' }}>
            <div className="tier-badge" style={{ minWidth: 24, fontSize: 11 }}>#{item.rank}</div>
            <div className="ar-info" style={{ flex: 1 }}>
              <div className="ar-name">{item.name}</div>
              <div className="ar-detail">
                {item.category} &middot; Weee ${item.weeePrice}
                {item.trending && <span className="c-green" style={{ marginLeft: 6 }}>TRENDING</span>}
              </div>
              {item.ustMatch && (
                <div className="ar-detail" style={{ marginTop: 2 }}>
                  UST: {item.ustMatch.ustProduct} &middot; ${item.ustMatch.ustPrice} &middot;{' '}
                  <span className="c-green">{item.ustMatch.margin} margin</span>
                </div>
              )}
            </div>
            <div className={`ar-status ${item.ustMatch ? 'c-green' : 'c-red'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
              {item.ustMatch ? item.ustMatch.match : 'no match'}
            </div>
          </div>
        ))}
      </div>

      {/* Category Trends */}
      <div className="card">
        <div className="card-title">Category Trends by Tier</div>
        {Object.entries(CATEGORY_BENCHMARKS).map(([tier, data]) => (
          <div key={tier} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div className="tier-badge">{tier}</div>
              <span className="card-sub">Avg ${data.avgMonthlyOrder.toLocaleString()}/mo</span>
            </div>
            {data.categories.slice(0, 4).map((cat, j) => (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 }}>
                <span style={{ width: 70, fontWeight: 500 }}>{cat.name}</span>
                <span style={{ width: 50, textAlign: 'right', color: 'var(--text-secondary)' }}>${cat.avgSpend}</span>
                <span className={cat.trend === 'up' ? 'c-green' : cat.trend === 'down' ? 'c-red' : 'c-yellow'}
                  style={{ width: 45, textAlign: 'right', fontSize: 11 }}>
                  {cat.trendPct > 0 ? '+' : ''}{cat.trendPct}%
                </span>
                <span style={{ flex: 1, fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.note}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ height: 100 }} />
    </div>
  );
}
