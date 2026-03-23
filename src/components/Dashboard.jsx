import React from 'react';

export default function Dashboard({ rep }) {
  const gap = rep.monthlyTarget - rep.mtdSales;
  const pct = Math.round((rep.mtdSales / rep.monthlyTarget) * 100);
  const dailyNeeded = Math.round(gap / rep.businessDaysLeft);
  const overdue = rep.accounts.filter(a => a.arStatus === "overdue");
  const flagged = rep.accounts.filter(a => a.arStatus === "flagged");

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
              <div className="ar-dot" style={{ background: '#fbbf24' }} />
              <div className="ar-info">
                <div className="ar-name">{a.name}</div>
                <div className="ar-detail">{a.daysPastDue}d overdue &middot; ${a.overdueAmount}</div>
              </div>
            </div>
          ))}
          {flagged.map((a, i) => (
            <div key={i} className="ar-row">
              <div className="ar-dot" style={{ background: '#f87171' }} />
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

      <div style={{ height: 100 }} />
    </div>
  );
}
