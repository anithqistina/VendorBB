import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function More() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile"); // profile | whatsapp | database
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [form, setForm] = useState({
    company_name: "VendorBB",
    company_logo: "",
    default_week: "Mon-Sun",
    whatsapp_template: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      setForm({
        company_name: res.data.company_name || "VendorBB",
        company_logo: res.data.company_logo || "",
        default_week: res.data.default_week || "Mon-Sun",
        whatsapp_template: res.data.whatsapp_template || "",
      });
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await api.put("/settings", form);
      alert("Settings updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleBackup = async () => {
    try {
      const res = await api.get("/settings/backup", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vendorbb_backup_${new Date().toISOString().split("T")[0]}.db`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Backup failed", err);
      alert("Database backup failed");
    }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "⚠️ WARNING: Restoring the database will OVERWRITE all current vendors, foods, deliveries, and payment records. This action cannot be undone.\n\nAre you sure you want to proceed?"
    );

    if (confirmRestore) {
      setRestoring(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        await api.post("/settings/restore", arrayBuffer, {
          headers: {
            "Content-Type": "application/octet-stream",
          },
        });
        alert("Database restored successfully!");
        fetchSettings(); // Refresh settings
      } catch (err) {
        console.error("Restore failed", err);
        alert("Database restore failed. Ensure you uploaded a valid sqlite database file.");
      } finally {
        setRestoring(false);
        e.target.value = ""; // Clear file input
      }
    } else {
      e.target.value = ""; // Clear file input
    }
  };

  return (
    <div className="container mt-2 text-start" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">
          <i className="bi bi-gear me-2 text-success"></i> Settings & System Tools
        </h2>
      </div>

      <div className="row g-4">
        {/* Navigation Cards on Left */}
        <div className="col-12 col-md-4">
          {/* Quick Reports Card */}
          <div
            className="card shadow-sm border border-light-subtle mb-4 bg-success text-white p-3 cursor-pointer"
            onClick={() => navigate("/reports")}
            style={{ borderRadius: "8px", transition: "transform 0.2s" }}
          >
            <div className="card-body text-center py-4">
              <i className="bi bi-bar-chart text-white d-block mb-2" style={{ fontSize: "2.5rem" }}></i>
              <h5 className="fw-bold">View System Reports</h5>
              <p className="small mb-0 opacity-75">Daily, weekly aggregates and exports</p>
            </div>
          </div>

          {/* Settings Tabs menu */}
          <div className="list-group shadow-sm border border-light-subtle" style={{ borderRadius: "8px", overflow: "hidden" }}>
            <button
              onClick={() => setActiveTab("profile")}
              className={`list-group-item list-group-item-action border-0 py-3 ${
                activeTab === "profile" ? "active bg-success text-white" : ""
              }`}
            >
              <i className="bi bi-building me-2"></i> Company Profile
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`list-group-item list-group-item-action border-0 py-3 ${
                activeTab === "whatsapp" ? "active bg-success text-white" : ""
              }`}
            >
              <i className="bi bi-chat-left-text me-2"></i> WhatsApp Template
            </button>
            <button
              onClick={() => setActiveTab("database")}
              className={`list-group-item list-group-item-action border-0 py-3 ${
                activeTab === "database" ? "active bg-success text-white" : ""
              }`}
            >
              <i className="bi bi-database me-2"></i> Database Management
            </button>
          </div>
        </div>

        {/* Tab Contents on Right */}
        <div className="col-12 col-md-8">
          <div className="card shadow-sm border" style={{ borderRadius: "12px" }}>
            <div className="card-body p-4">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status"></div>
                </div>
              ) : (
                <>
                  {/* Company Profile Tab */}
                  {activeTab === "profile" && (
                    <div>
                      <h4 className="fw-bold mb-3">Company Profile</h4>
                      <hr className="mb-4" />

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted">Company Name</label>
                        <input
                          type="text"
                          className="form-control py-2.5"
                          name="company_name"
                          value={form.company_name}
                          onChange={handleChange}
                          placeholder="e.g. My Food Vendor Hub"
                        />
                      </div>

                      <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">Default Active Days</label>
                        <select
                          className="form-select py-2.5"
                          name="default_week"
                          value={form.default_week}
                          onChange={handleChange}
                        >
                          <option value="Mon-Fri">Monday - Friday (5 Days)</option>
                          <option value="Mon-Sat">Monday - Saturday (6 Days)</option>
                          <option value="Mon-Sun">Monday - Sunday (7 Days)</option>
                        </select>
                        <small className="text-muted">Determines standard billing interval selections</small>
                      </div>

                      <button className="btn btn-success py-2 px-4 fw-bold shadow-sm" onClick={handleSaveSettings}>
                        Save Profile Settings
                      </button>
                    </div>
                  )}

                  {/* WhatsApp Template Tab */}
                  {activeTab === "whatsapp" && (
                    <div>
                      <h4 className="fw-bold mb-3">WhatsApp Template Customization</h4>
                      <hr className="mb-4" />

                      <div className="mb-3">
                        <label className="form-label small fw-semibold text-muted">Message Template</label>
                        <textarea
                          className="form-control font-monospace text-dark p-3"
                          name="whatsapp_template"
                          value={form.whatsapp_template}
                          onChange={handleChange}
                          rows="10"
                          style={{ fontSize: "0.85rem", lineHeight: "145%", background: "#f8f9fa" }}
                          placeholder="Configure your template here..."
                        ></textarea>
                      </div>

                      <div className="alert alert-info border-0 p-3 small mb-4">
                        <h6 className="fw-bold mb-2">💡 AVAILABLE MERGE TAGS:</h6>
                        <ul className="mb-0 ps-3">
                          <li><code>{"{vendor_name}"}</code>: Name of the food vendor</li>
                          <li><code>{"{week_start}"}</code>: Start date of payment (e.g. 6/7)</li>
                          <li><code>{"{week_end}"}</code>: End date of payment (e.g. 10/7)</li>
                          <li><code>{"{bank_name}"}</code>: Vendor's registered bank</li>
                          <li><code>{"{account_number}"}</code>: Vendor's bank account number</li>
                          <li><code>{"{food_list}"}</code>: Listing of foods sold, counts, and item prices</li>
                          <li><code>{"{total_payment}"}</code>: Grand total payment due (RM)</li>
                        </ul>
                      </div>

                      <button className="btn btn-success py-2 px-4 fw-bold shadow-sm" onClick={handleSaveSettings}>
                        Save WhatsApp Template
                      </button>
                    </div>
                  )}

                  {/* Database Management Tab */}
                  {activeTab === "database" && (
                    <div>
                      <h4 className="fw-bold mb-3">Database Management</h4>
                      <hr className="mb-4" />

                      <div className="row g-4 text-start">
                        {/* Backup Column */}
                        <div className="col-12 col-md-6 border-end">
                          <h6 className="fw-bold text-muted mb-2">SYSTEM BACKUP</h6>
                          <p className="small text-muted mb-3">
                            Download the current SQLite database containing all records. Keep this file safe as a recovery point.
                          </p>
                          <button className="btn btn-outline-success py-2 px-4 w-100 fw-bold" onClick={handleBackup}>
                            <i className="bi bi-download me-1"></i> Download Backup (.db)
                          </button>
                        </div>

                        {/* Restore Column */}
                        <div className="col-12 col-md-6">
                          <h6 className="fw-bold text-danger mb-2">SYSTEM RESTORE</h6>
                          <p className="small text-muted mb-3">
                            Restore system data by uploading a previously downloaded `.db` database backup.
                          </p>
                          
                          <input
                            type="file"
                            id="restore-upload"
                            accept=".db"
                            onChange={handleRestore}
                            className="d-none"
                            disabled={restoring}
                          />
                          <label
                            htmlFor="restore-upload"
                            className={`btn btn-${restoring ? "secondary" : "danger"} py-2 px-4 w-100 fw-bold`}
                            style={{ cursor: restoring ? "not-allowed" : "pointer" }}
                          >
                            {restoring ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Restoring...
                              </>
                            ) : (
                              <>
                                <i className="bi bi-upload me-1"></i> Upload & Restore
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cursor-pointer {
          cursor: pointer;
        }
        .bg-success {
          background-color: #198754 !important;
        }
        .list-group-item.active {
          background-color: #198754 !important;
        }
      `}</style>
    </div>
  );
}