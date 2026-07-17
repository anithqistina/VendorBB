import { useState, useEffect } from "react";
import api from "../services/api";
import { showToast } from "../services/toast";

export default function Payments() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [records, setRecords] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | has_sales | unpaid

  useEffect(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(sunday.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) fetchWeeklySummary();
  }, [startDate, endDate]);

  useEffect(() => {
    if (activeTab === "history") fetchPaymentHistory();
  }, [activeTab]);

  const fetchWeeklySummary = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments/weekly-summary/${startDate}/${endDate}`);
      setRecords(res.data);
    } catch { showToast("Failed to load weekly summary", "error"); }
    finally { setLoading(false); }
  };

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments/history");
      setHistory(res.data);
    } catch { showToast("Failed to load history log", "error"); }
    finally { setLoading(false); }
  };

  const handlePay = async (record) => {
    try {
      await api.post("/payments/pay", {
        vendor_id: record.vendor.id,
        week_start: startDate,
        week_end: endDate,
        total_payment: record.total_payment,
        remarks: "",
      });
      showToast(`${record.vendor.vendor_name} marked as PAID ✅`);
      fetchWeeklySummary();
    } catch { showToast("Failed to mark as paid", "error"); }
  };

  const handleMarkAllPaid = async () => {
    const unpaid = records.filter(r => !r.is_paid && r.total_payment > 0);
    if (unpaid.length === 0) { showToast("All vendors are already marked as paid", "info"); return; }
    if (!window.confirm(`Mark ${unpaid.length} vendors as PAID for this week?`)) return;

    try {
      await api.post("/payments/mark-all-paid", {
        week_start: startDate,
        week_end: endDate,
        payments: unpaid.map(r => ({ vendor_id: r.vendor.id, total_payment: r.total_payment })),
      });
      showToast(`✅ ${unpaid.length} vendors marked as PAID!`);
      fetchWeeklySummary();
    } catch { showToast("Failed to mark all as paid", "error"); }
  };

  const fmtShort = (d) => {
    if (!d) return "";
    const [, m, day] = d.split("-");
    return `${Number(day)}/${Number(m)}`;
  };

  // ---- Generate Boss Message containing 1-50 list format ----
  const generateBossMessage = () => {
    const today = new Date().toLocaleDateString("en-MY", { day: 'numeric', month: 'numeric', year: 'numeric' });
    let msg = `*📋 WEEKLY VENDOR PAYMENT LIST*\n`;
    msg += `Payment Date: ${today} 💚\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    let grandTotal = 0;
    records.forEach((rec, idx) => {
      const total = Number(rec.total_payment);
      grandTotal += total;
      msg += `${idx + 1}. *${rec.vendor.vendor_name}*\n`;
      msg += `🏦 ${rec.vendor.bank_name || "—"}\n`;
      msg += `${rec.vendor.bank_holder_name || "—"}\n`;
      msg += `${rec.vendor.account_number || "—"}\n`;
      msg += `Total: RM ${total.toFixed(2)}\n\n`;
    });

    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *GRAND TOTAL: RM ${grandTotal.toFixed(2)}*\n`;
    return msg;
  };

  // ---- Generate WhatsApp message for individual vendor in exact format requested ----
  const generateVendorMessage = (rec, index) => {
    const today = new Date().toLocaleDateString("en-MY", { day: 'numeric', month: 'numeric', year: 'numeric' });
    const bankName = rec.vendor.bank_name || "—";
    const holderName = rec.vendor.bank_holder_name || "—";
    const accNumber = rec.vendor.account_number || "—";
    const total = Number(rec.total_payment).toFixed(2);

    return `${index + 1}. ${rec.vendor.vendor_name}
${today} 💚

🏦 ${bankName}
${holderName}
${accNumber}

Total: RM ${total}`;
  };

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard! 📋`);
  };

  const totalWeekly = records.reduce((sum, r) => sum + Number(r.total_payment), 0);
  const paidCount = records.filter(r => r.is_paid).length;
  const unpaidCount = records.filter(r => !r.is_paid && r.total_payment > 0).length;

  const filteredRecords = records.filter(r => {
    if (filter === "has_sales") return r.total_payment > 0;
    if (filter === "unpaid") return !r.is_paid && r.total_payment > 0;
    return true;
  });

  return (
    <div className="container mt-2 text-start pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="fw-bold m-0 text-dark">
          <i className="bi bi-wallet2 me-2 text-success"></i> Weekly Payments
        </h2>
        <div className="btn-group shadow-sm">
          <button
            className={`btn btn-${activeTab === "summary" ? "success" : "outline-success"} shadow-none`}
            onClick={() => setActiveTab("summary")}
          >
            Weekly Summary
          </button>
          <button
            className={`btn btn-${activeTab === "history" ? "success" : "outline-success"} shadow-none`}
            onClick={() => setActiveTab("history")}
          >
            Payment History
          </button>
        </div>
      </div>

      {activeTab === "summary" ? (
        <>
          {/* Week Range Selector */}
          <div className="card shadow-sm border border-light-subtle mb-3" style={{ borderRadius: "8px" }}>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted text-uppercase">From (Monday)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 text-muted">
                      <i className="bi bi-calendar3"></i>
                    </span>
                    <input
                      type="date"
                      className="form-control border-start-0 ps-0 shadow-none"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      onClick={(e) => e.target.showPicker()}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted text-uppercase">To (Sunday)</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light border-end-0 text-muted">
                      <i className="bi bi-calendar3"></i>
                    </span>
                    <input
                      type="date"
                      className="form-control border-start-0 ps-0 shadow-none"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      onClick={(e) => e.target.showPicker()}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          {records.length > 0 && (
            <div className="row g-2 mb-3">
              <div className="col-4">
                <div className="card border border-light-subtle shadow-sm text-center p-3" style={{ borderRadius: "8px", background: "linear-gradient(135deg,var(--accent-bg),rgba(30,174,71,0.02))" }}>
                  <div className="fw-bold text-success" style={{ fontSize: "1.2rem" }}>RM {totalWeekly.toFixed(2)}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Weekly Total</div>
                </div>
              </div>
              <div className="col-4">
                <div className="card border border-light-subtle shadow-sm text-center p-3" style={{ borderRadius: "8px", background: "linear-gradient(135deg,rgba(13,110,253,0.05),rgba(13,110,253,0.02))" }}>
                  <div className="fw-bold text-primary" style={{ fontSize: "1.2rem" }}>{paidCount}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Paid</div>
                </div>
              </div>
              <div className="col-4">
                <div className="card border border-light-subtle shadow-sm text-center p-3" style={{ borderRadius: "8px", background: "linear-gradient(135deg,rgba(245,158,11,0.05),rgba(245,158,11,0.02))" }}>
                  <div className="fw-bold text-warning" style={{ fontSize: "1.2rem" }}>{unpaidCount}</div>
                  <div className="text-muted small" style={{ fontSize: "0.75rem" }}>Unpaid</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {records.length > 0 && (
            <div className="d-flex gap-2 mb-3 flex-wrap">
              {/* Send to Boss */}
              <button
                className="btn btn-success flex-fill fw-bold shadow-sm"
                style={{ borderRadius: "8px" }}
                onClick={() => copyText(generateBossMessage(), "Boss message")}
              >
                <i className="bi bi-whatsapp me-2"></i>
                Send to Boss (Copy)
              </button>

              {/* Mark All Paid */}
              {unpaidCount > 0 && (
                <button
                  className="btn btn-outline-success flex-fill shadow-sm"
                  style={{ borderRadius: "8px" }}
                  onClick={handleMarkAllPaid}
                >
                  <i className="bi bi-check2-all me-1"></i>
                  Mark All Paid ({unpaidCount})
                </button>
              )}
            </div>
          )}

          {/* Filter Pills */}
          {records.length > 0 && (
            <div className="d-flex gap-2 mb-3">
              {[
                { key: "all", label: `All (${records.length})` },
                { key: "has_sales", label: `With Sales (${records.filter(r => r.total_payment > 0).length})` },
                { key: "unpaid", label: `Unpaid (${unpaidCount})` },
              ].map(f => (
                <button
                  key={f.key}
                  className={`btn btn-sm shadow-none ${filter === f.key ? "btn-success" : "btn-outline-secondary"}`}
                  style={{ borderRadius: "20px", fontSize: "0.8rem" }}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Vendor List */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-5 text-muted bg-white rounded shadow-sm border border-light-subtle">
              No transactions recorded for this week.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredRecords.map((rec) => {
                const hasSales = rec.total_payment > 0;
                const originalIdx = records.indexOf(rec);

                return (
                  <div
                    key={rec.vendor.id}
                    className="card border border-light-subtle shadow-sm card-kpi"
                    style={{
                      borderRadius: "8px",
                    }}
                  >
                    {/* Vendor Header */}
                    <div className="card-body p-3 pb-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="fw-bold text-success d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: "28px", height: "28px", background: "var(--accent-bg)", borderRadius: "50%", fontSize: "0.75rem", border: "1px solid var(--accent-border)" }}
                          >
                            {originalIdx + 1}
                          </span>
                          <div>
                            <div className="fw-bold text-dark">{rec.vendor.vendor_name}</div>
                            <div className="text-muted small">{rec.vendor.phone}</div>
                          </div>
                        </div>
                        <span
                          className={`badge rounded-pill d-flex align-items-center gap-1 ${
                            rec.is_paid
                              ? "bg-success-subtle text-success border border-success"
                              : hasSales
                              ? "bg-warning-subtle text-warning border border-warning"
                              : "bg-secondary-subtle text-secondary border border-secondary"
                          }`}
                          style={{ fontSize: "0.7rem", padding: "0.4em 0.8em" }}
                        >
                          {rec.is_paid ? (
                            <><i className="bi bi-check-circle"></i> Paid</>
                          ) : hasSales ? (
                            <><i className="bi bi-clock"></i> Unpaid</>
                          ) : (
                            "—"
                          )}
                        </span>
                      </div>

                      {/* Sales breakdown */}
                      {hasSales ? (
                        <>
                          <div className="mt-2 mb-2">
                            {rec.foods.map((f, fi) => (
                              <div key={fi} className="d-flex justify-content-between small text-muted py-1 border-bottom">
                                <span>{f.food_name}</span>
                                <span>{f.qty_sold} × RM{Number(f.vendor_price).toFixed(2)} = <strong className="text-dark">RM{Number(f.total_payment).toFixed(2)}</strong></span>
                              </div>
                            ))}
                          </div>

                          {/* Bank + Total */}
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <div className="small text-muted" style={{ fontSize: "0.8rem" }}>
                              <i className="bi bi-bank me-1"></i>
                              {rec.vendor.bank_name || "—"} • {rec.vendor.bank_holder_name || "—"}
                            </div>
                            <div className="fw-bold text-success">RM {Number(rec.total_payment).toFixed(2)}</div>
                          </div>

                          {/* Action buttons */}
                          <div className="d-flex gap-2 mt-3">
                            <button
                              className="btn btn-outline-success btn-sm flex-fill shadow-none"
                              style={{ borderRadius: "6px" }}
                              onClick={() => copyText(generateVendorMessage(rec, originalIdx), rec.vendor.vendor_name)}
                            >
                              <i className="bi bi-whatsapp me-1"></i> Copy WA
                            </button>
                            {!rec.is_paid ? (
                              <button
                                className="btn btn-success btn-sm flex-fill shadow-none"
                                style={{ borderRadius: "6px" }}
                                onClick={() => handlePay(rec)}
                              >
                                <i className="bi bi-check-circle me-1"></i> Mark as Paid
                              </button>
                            ) : (
                              <button className="btn btn-secondary btn-sm flex-fill shadow-none" disabled style={{ borderRadius: "6px" }}>
                                Paid <i className="bi bi-check2"></i>
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-muted small mt-2">No sales recorded for this week</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ---- PAYMENT HISTORY ---- */
        <div className="card shadow-sm border-0" style={{ borderRadius: "14px" }}>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-5 text-muted">No payment records logged yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-3">Date</th>
                      <th>Vendor</th>
                      <th>Week</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(h => (
                      <tr key={h.id}>
                        <td className="px-3 text-muted small">{h.paid_date}</td>
                        <td className="fw-semibold">{h.vendor_name}</td>
                        <td className="small">{fmtShort(h.week_start)} - {fmtShort(h.week_end)}</td>
                        <td className="fw-bold text-success">RM {Number(h.total_payment).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}