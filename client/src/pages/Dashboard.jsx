import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalVendors: 0,
    totalFoods: 0,
    todaysDeliveries: 0,
    weeklyPayment: 0,
    monthlySpending: 0,
  });
  const [charts, setCharts] = useState({
    weekly: [],
    monthly: [],
  });
  const [activity, setActivity] = useState({
    deliveries: [],
    closings: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, chartsRes, activityRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/dashboard/charts"),
        api.get("/dashboard/activity"),
      ]);
      setStats(statsRes.data);
      setCharts(chartsRes.data);
      setActivity(activityRes.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = () => {
    return new Date().toLocaleString("en-US", { month: "long" });
  };

  // Helper to draw a modern responsive SVG Bar Chart
  const renderBarChart = (data, title, colorClass, isWeekly) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-5 text-muted small bg-light rounded border">
          No transaction history available to display chart.
        </div>
      );
    }

    const maxVal = Math.max(...data.map((d) => d.amount), 50); // Min scale of 50
    const chartWidth = 300;
    const barWidth = 25;
    const spacing = 15;
    const startX = 35;
    const startY = 130;

    return (
      <div className="card p-3 shadow-sm h-100">
        <h6 className="fw-bold text-muted text-uppercase small mb-3">{title}</h6>
        <svg viewBox={`0 0 ${chartWidth} 180`} width="100%" height="100%">
          {/* Gradients */}
          <defs>
            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={startX} y1="30" x2="280" y2="30" stroke="currentColor" opacity="0.08" strokeWidth="1" />
          <line x1={startX} y1="80" x2="280" y2="80" stroke="currentColor" opacity="0.08" strokeWidth="1" />
          <line x1={startX} y1={startY} x2="280" y2={startY} stroke="currentColor" opacity="0.15" strokeWidth="1.5" />

          {/* Y Axis Labels */}
          <text x="5" y="33" fontSize="8" fill="currentColor" opacity="0.6" fontWeight="600">
            RM{Math.round(maxVal)}
          </text>
          <text x="5" y="83" fontSize="8" fill="currentColor" opacity="0.6" fontWeight="600">
            RM{Math.round(maxVal / 2)}
          </text>
          <text x="5" y={startY + 3} fontSize="8" fill="currentColor" opacity="0.6" fontWeight="600">
            RM0
          </text>

          {/* Bars */}
          {data.map((item, idx) => {
            const label = isWeekly
              ? item.week_start ? item.week_start.split("-").slice(1).reverse().join("/") : ""
              : item.month ? item.month.split("-").reverse().join("/") : "";

            const val = item.amount || 0;
            const barHeight = (val / maxVal) * 100;
            const x = startX + idx * (barWidth + spacing) + 10;
            const y = startY - barHeight;

            return (
              <g key={idx}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  fill={`url(#${colorClass === "emerald" ? "emeraldGrad" : "greenGrad"})`}
                  style={{ transition: "all 0.5s ease" }}
                />
                {/* Value Label */}
                {val > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="bold"
                    fill="var(--accent)"
                  >
                    {Math.round(val)}
                  </text>
                )}
                {/* X Axis Label */}
                <text
                  x={x + barWidth / 2}
                  y={startY + 14}
                  textAnchor="middle"
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.6"
                  fontWeight="bold"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container mt-2 text-start pb-5">
      {/* Welcome Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-dark">
            <i className="bi bi-speedometer2 me-2 text-success"></i> Dashboard Overview
          </h2>
          <p className="text-muted small m-0">Today's food vendor management summary</p>
        </div>
        <button className="btn btn-outline-success btn-sm shadow-none" onClick={fetchDashboardData} style={{ borderRadius: "8px" }}>
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="row g-3 mb-4">
        {/* Total Vendors */}
        <div className="col-6 col-md-4">
          <div
            className="card border border-light-subtle shadow-sm h-100 card-kpi"
            style={{ borderRadius: "8px", cursor: "pointer" }}
            onClick={() => navigate("/vendors")}
          >
            <div className="card-body py-3 px-3">
              <div className="text-muted small fw-semibold text-uppercase">Total Vendors</div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <h3 className="fw-bold text-dark m-0">{stats.totalVendors}</h3>
                <i className="bi bi-people text-success fs-3 opacity-50"></i>
              </div>
              <small className="text-muted text-xs d-block mt-2">Click to manage vendors →</small>
            </div>
          </div>
        </div>

        {/* Total Foods */}
        <div className="col-6 col-md-4">
          <div
            className="card border border-light-subtle shadow-sm h-100 card-kpi"
            style={{ borderRadius: "8px", cursor: "pointer" }}
            onClick={() => navigate("/vendors")}
          >
            <div className="card-body py-3 px-3">
              <div className="text-muted small fw-semibold text-uppercase">Food Menu Items</div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <h3 className="fw-bold text-dark m-0">{stats.totalFoods}</h3>
                <i className="bi bi-egg text-success fs-3 opacity-50"></i>
              </div>
              <small className="text-muted text-xs d-block mt-2">Manage menu items →</small>
            </div>
          </div>
        </div>

        {/* Today's Deliveries */}
        <div className="col-6 col-md-4">
          <div
            className="card border border-light-subtle shadow-sm h-100 card-kpi"
            style={{ borderRadius: "8px", cursor: "pointer" }}
            onClick={() => navigate("/delivery")}
          >
            <div className="card-body py-3 px-3">
              <div className="text-muted small fw-semibold text-uppercase">Today's Deliveries</div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <h3 className="fw-bold text-dark m-0">{stats.todaysDeliveries}</h3>
                <i className="bi bi-truck text-success fs-3 opacity-50"></i>
              </div>
              <small className="text-muted text-xs d-block mt-2">Log delivery →</small>
            </div>
          </div>
        </div>

        {/* Weekly Payment Due */}
        <div className="col-6 col-md-6 col-lg-6">
          <div
            className="card border border-light-subtle shadow-sm h-100 card-kpi"
            style={{ borderRadius: "8px", cursor: "pointer" }}
            onClick={() => navigate("/payments")}
          >
            <div className="card-body py-3 px-3">
              <div className="text-muted small fw-semibold text-uppercase">Weekly Unpaid</div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <h4 className="fw-bold text-dark m-0">RM {Number(stats.weeklyPayment).toFixed(2)}</h4>
                <i className="bi bi-wallet2 text-success fs-3 opacity-50"></i>
              </div>
              <small className="text-muted text-xs d-block mt-2">Calculate payments →</small>
            </div>
          </div>
        </div>

        {/* Monthly Spend */}
        <div className="col-12 col-md-6 col-lg-6">
          <div className="card border border-light-subtle shadow-sm h-100 card-kpi" style={{ borderRadius: "8px" }}>
            <div className="card-body py-3 px-3">
              <div className="text-muted small fw-semibold text-uppercase">Monthly Spend ({getMonthName()})</div>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <h4 className="fw-bold text-dark m-0">RM {Number(stats.monthlySpending).toFixed(2)}</h4>
                <i className="bi bi-graph-up text-success fs-3 opacity-50"></i>
              </div>
              <small className="text-muted text-xs d-block mt-2">Total settled + unsettled</small>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6">
          {renderBarChart(charts.weekly, "Weekly Spending Trend (RM)", "emerald", true)}
        </div>
        <div className="col-12 col-md-6">
          {renderBarChart(charts.monthly, "Monthly Spending Trend (RM)", "green", false)}
        </div>
      </div>

      {/* Recent Activity lists */}
      <div className="row g-3">
        {/* Latest Deliveries */}
        <div className="col-12 col-md-6">
          <div className="card shadow-sm border border-light-subtle h-100" style={{ borderRadius: "8px" }}>
            <div className="card-body">
              <h6 className="card-title fw-bold text-muted text-uppercase small mb-3">
                <i className="bi bi-clock-history me-1 text-success"></i> Recent Deliveries
              </h6>
              {activity.deliveries.length === 0 ? (
                <p className="text-muted small py-4 text-center">No recent deliveries recorded.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {activity.deliveries.map((d, index) => (
                    <div className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center" key={d.id || index}>
                      <div>
                        <div className="fw-semibold text-dark small">{d.vendor_name}</div>
                        <small className="text-muted text-xs">{d.delivery_date}</small>
                      </div>
                      <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                        {d.total_qty || 0} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Latest Closings */}
        <div className="col-12 col-md-6">
          <div className="card shadow-sm border border-light-subtle h-100" style={{ borderRadius: "8px" }}>
            <div className="card-body">
              <h6 className="card-title fw-bold text-muted text-uppercase small mb-3">
                <i className="bi bi-check2-circle me-1 text-success"></i> Recent Closings
              </h6>
              {activity.closings.length === 0 ? (
                <p className="text-muted small py-4 text-center">No recent closings recorded.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {activity.closings.map((c, index) => (
                    <div className="list-group-item px-0 py-2.5 d-flex justify-content-between align-items-center" key={c.id || index}>
                      <div>
                        <div className="fw-semibold text-dark small">{c.vendor_name}</div>
                        <small className="text-muted text-xs">{c.delivery_date}</small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success small">RM {Number(c.total_payment).toFixed(2)}</div>
                        <small className="text-muted text-xs">{c.total_sold} sold</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .card-kpi {
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .card-kpi:hover {
          border-color: var(--accent) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
        }
        .text-xs {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}