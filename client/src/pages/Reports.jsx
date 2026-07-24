import { useState, useEffect } from "react";
import api from "../services/api";

export default function Reports() {
  const [reportType, setReportType] = useState("daily"); // daily | weekly | monthly
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [month, setMonth] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);

    const year = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    setMonth(`${year}-${m}`);

    // Current week dates
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today.setDate(today.getDate() + distanceToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(sunday.toISOString().split("T")[0]);
  }, []);

  const generateReport = async () => {
    setLoading(true);
    try {
      let res;
      if (reportType === "daily") {
        res = await api.get(`/reports/daily?date=${date}`);
      } else if (reportType === "weekly") {
        res = await api.get(`/reports/weekly?start=${startDate}&end=${endDate}`);
      } else if (reportType === "monthly") {
        res = await api.get(`/reports/monthly?month=${month}`);
      }
      setData(res.data);
    } catch (err) {
      console.error("Error generating report", err);
      alert("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const getReportTitle = () => {
    if (reportType === "daily") return `Daily Report for ${date}`;
    if (reportType === "weekly") return `Weekly Report (${startDate} to ${endDate})`;
    if (reportType === "monthly") {
      const [y, m] = month.split("-");
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      return `Monthly Report - ${monthNames[Number(m) - 1]} ${y}`;
    }
    return "Report";
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    let headers = [];
    let rows = [];

    if (reportType === "daily" || reportType === "weekly") {
      headers = ["Vendor Name", "Food Name", "Price (RM)", "Delivered", "Remaining", "Sold", "Payment Due (RM)"];
      rows = data.map((item) => [
        item.vendor_name,
        item.food_name,
        Number(item.vendor_price).toFixed(2),
        item.qty_delivered,
        item.qty_remaining,
        item.qty_sold,
        Number(item.payment || item.total_payment || 0).toFixed(2),
      ]);
    } else {
      headers = ["Vendor Name", "Bank Details", "Account Number", "Total Sales (RM)", "Total Paid (RM)"];
      rows = data.map((item) => [
        item.vendor_name,
        item.bank_name || "-",
        item.account_number || "-",
        Number(item.total_revenue || 0).toFixed(2),
        Number(item.total_paid || 0).toFixed(2),
      ]);
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach((r) => {
      const rowEscaped = r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",");
      csvContent += rowEscaped + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const filename = `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCalculated = () => {
    if (reportType === "daily" || reportType === "weekly") {
      return data.reduce((sum, item) => sum + (Number(item.payment || item.total_payment) || 0), 0);
    }
    return data.reduce((sum, item) => sum + (Number(item.total_revenue) || 0), 0);
  };

  return (
    <div className="container mt-2 text-start">
      <div className="d-flex justify-content-between align-items-center mb-3 d-print-none">
        <h2 className="fw-bold m-0">
          <i className="bi bi-bar-chart me-2 text-success"></i> Report Generator
        </h2>
        <div className="btn-group">
          <button
            className={`btn btn-${reportType === "daily" ? "success" : "outline-success"}`}
            onClick={() => { setReportType("daily"); setData([]); }}
          >
            Daily
          </button>
          <button
            className={`btn btn-${reportType === "weekly" ? "success" : "outline-success"}`}
            onClick={() => { setReportType("weekly"); setData([]); }}
          >
            Weekly
          </button>
          <button
            className={`btn btn-${reportType === "monthly" ? "success" : "outline-success"}`}
            onClick={() => { setReportType("monthly"); setData([]); }}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Filter Parameters Form */}
      <div className="card shadow-sm mb-4 d-print-none">
        <div className="card-body">
          <div className="row align-items-end g-3">
            {reportType === "daily" && (
              <div className="col-12 col-md-8 text-start">
                <label className="form-label small fw-semibold text-muted">Select Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            )}

            {reportType === "weekly" && (
              <>
                <div className="col-6 col-md-4 text-start">
                  <label className="form-label small fw-semibold text-muted">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="col-6 col-md-4 text-start">
                  <label className="form-label small fw-semibold text-muted">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {reportType === "monthly" && (
              <div className="col-12 col-md-8 text-start">
                <label className="form-label small fw-semibold text-muted">Select Month</label>
                <input
                  type="month"
                  className="form-control"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
            )}

            <div className="col-12 col-md-4">
              <button className="btn btn-success w-100 py-2 fw-semibold shadow-none" onClick={generateReport}>
                <i className="bi bi-gear me-1"></i> Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Display area */}
      {loading ? (
        <div className="text-center py-5 d-print-none">
          <div className="spinner-border text-success" role="status"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-5 text-muted bg-white rounded shadow-sm border d-print-none">
          Please click Generate to retrieve transaction report records.
        </div>
      ) : (
        <div className="card shadow-sm border" id="printable-report">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
            <div>
              <h5 className="fw-bold m-0 text-dark">{getReportTitle()}</h5>
              <small className="text-muted d-print-none">VendorBB Management System</small>
            </div>
            <div className="d-flex gap-2 d-print-none">
              <button className="btn btn-outline-secondary btn-sm" onClick={handlePrint}>
                <i className="bi bi-printer me-1"></i> Print PDF
              </button>
              <button className="btn btn-outline-success btn-sm" onClick={handleExportCSV}>
                <i className="bi bi-file-earmark-excel me-1"></i> Export Excel
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            {reportType === "daily" || reportType === "weekly" ? (
              <div className="table-responsive">
                <table className="table table-striped table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4">Vendor</th>
                      <th>Food Item</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Delivered</th>
                      <th className="text-end">Remaining</th>
                      <th className="text-end">Sold</th>
                      <th className="text-end px-4">Payment Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 fw-semibold">{item.vendor_name}</td>
                        <td>{item.food_name}</td>
                        <td className="text-end">RM {Number(item.vendor_price).toFixed(2)}</td>
                        <td className="text-end">{item.qty_delivered}</td>
                        <td className="text-end">{item.qty_remaining}</td>
                        <td className="text-end fw-semibold">{item.qty_sold}</td>
                        <td className="text-end px-4 fw-bold text-success">
                          RM {Number(item.payment || item.total_payment || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Monthly Report Table */
              <div className="table-responsive">
                <table className="table table-striped table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4">Vendor Name</th>
                      <th>Bank Name</th>
                      <th>Account number</th>
                      <th className="text-end">Total Sales</th>
                      <th className="text-end px-4">Settled Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 fw-semibold">{item.vendor_name}</td>
                        <td>{item.bank_name || "-"}</td>
                        <td>{item.account_number || "-"}</td>
                        <td className="text-end fw-bold text-success">
                          RM {Number(item.total_revenue || 0).toFixed(2)}
                        </td>
                        <td className="text-end px-4">
                          <span
                            className={`badge rounded-pill ${
                              Number(item.total_paid || 0) >= Number(item.total_revenue || 0) && Number(item.total_revenue || 0) > 0
                                ? "bg-success-subtle text-success border border-success"
                                : "bg-danger-subtle text-danger border border-danger"
                            }`}
                            style={{ padding: "0.5em 0.8em" }}
                          >
                            {Number(item.total_paid || 0) >= Number(item.total_revenue || 0) && Number(item.total_revenue || 0) > 0
                              ? "Settled"
                              : `Unsettled (Paid: RM${Number(item.total_paid || 0).toFixed(2)})`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Grand Summary Footer */}
            <div className="bg-light py-3 px-4 d-flex justify-content-between align-items-center border-top">
              <span className="fw-bold text-muted small uppercase">Grand Total Spending</span>
              <h3 className="fw-bold text-success m-0">RM {totalCalculated().toFixed(2)}</h3>
            </div>
          </div>
        </div>
      )}

      {/* CSS for print rendering */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .d-print-none, nav, footer, button, .navbar, #root > div:last-child {
            display: none !important;
          }
          #root {
            width: 100% !important;
            border: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-report {
            border: none !important;
            box-shadow: none !important;
          }
          .table {
            width: 100% !important;
            font-size: 11px !important;
          }
        }
      `}</style>
    </div>
  );
}
