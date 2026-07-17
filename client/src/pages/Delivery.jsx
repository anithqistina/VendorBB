import { useEffect, useState } from "react";
import api from "../services/api";
import { showToast } from "../services/toast";

export default function Delivery() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [foods, setFoods] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const res = await api.get("/deliveries/vendors");
      setVendors(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load vendors list", "error");
    }
  };

  const selectVendor = async (vendor) => {
    setSelectedVendor(vendor);
    setVendorId(vendor.id);
    setVendorSearch("");
    setShowVendorPicker(false);
    await loadFoods(vendor.id);
  };

  const loadFoods = async (id) => {
    if (!id) {
      setFoods([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get(`/deliveries/foods/${id}`);
      const data = res.data.map(food => ({
        ...food,
        qty: ""
      }));
      setFoods(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load vendor foods list", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index, value) => {
    const updated = [...foods];
    updated[index].qty = value;
    setFoods(updated);
  };

  const saveDelivery = async () => {
    if (!vendorId) {
      showToast("Please select a vendor", "warning");
      return;
    }

    const items = foods
      .map(food => ({
        food_id: food.id,
        qty: Number(food.qty) || 0
      }))
      .filter(item => item.qty > 0);

    if (items.length === 0) {
      showToast("Please enter a quantity of at least 1 item", "warning");
      return;
    }

    setSaving(true);
    try {
      await api.post("/deliveries", {
        vendor_id: vendorId,
        delivery_date: deliveryDate,
        items
      });
      showToast("✅ Delivery logged successfully!", "success");
      // Clear inputs
      const cleared = foods.map(f => ({ ...f, qty: "" }));
      setFoods(cleared);
    } catch (err) {
      console.error(err);
      showToast("Failed to save delivery records", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.phone && v.phone.includes(vendorSearch))
  );

  const totalDeliveredUnits = foods.reduce((sum, f) => sum + (Number(f.qty) || 0), 0);

  return (
    <div className="container mt-2 text-start pb-5" style={{ maxWidth: "600px" }}>
      <h2 className="fw-bold mb-4">
        <i className="bi bi-truck me-2 text-success"></i> Log Daily Delivery
      </h2>

      {/* Step 1: Date Selector */}
      <div className="card shadow-sm border border-light-subtle mb-3" style={{ borderRadius: "8px" }}>
        <div className="card-body">
          <label className="form-label small fw-semibold text-muted text-uppercase">
            <i className="bi bi-calendar3 me-1"></i> Delivery Date
          </label>
          <input
            type="date"
            className="form-control form-control-lg"
            style={{ borderRadius: "8px", fontWeight: "600" }}
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
      </div>

      {/* Step 2: Vendor Selector with Search */}
      <div className="card shadow-sm border border-light-subtle mb-3" style={{ borderRadius: "8px" }}>
        <div className="card-body">
          <label className="form-label small fw-semibold text-muted text-uppercase">
            <i className="bi bi-shop me-1"></i> Select Vendor
          </label>

          <button
            className="btn w-100 text-start d-flex justify-content-between align-items-center py-3 shadow-none"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: selectedVendor ? "var(--accent-bg)" : "var(--bg)",
              color: selectedVendor ? "var(--accent)" : "#6c757d",
            }}
            onClick={() => setShowVendorPicker(!showVendorPicker)}
          >
            <span className="fw-semibold">
              {selectedVendor ? selectedVendor.vendor_name : "Tap to select vendor..."}
            </span>
            <i className={`bi bi-chevron-${showVendorPicker ? "up" : "down"}`}></i>
          </button>

          {/* Vendor Search Dropdown */}
          {showVendorPicker && (
            <div className="mt-2 border rounded shadow-sm border-light-subtle" style={{ borderRadius: "8px", overflow: "hidden" }}>
              <div className="p-2" style={{ background: "var(--code-bg)" }}>
                <input
                  autoFocus
                  type="text"
                  className="form-control shadow-none"
                  placeholder="Type vendor name..."
                  value={vendorSearch}
                  onChange={e => setVendorSearch(e.target.value)}
                />
              </div>
              <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                {filteredVendors.length === 0 ? (
                  <div className="text-center text-muted py-3 small">No vendors found</div>
                ) : (
                  filteredVendors.map((v, idx) => (
                    <button
                      key={v.id}
                      className="btn w-100 text-start px-3 py-2 border-0 border-bottom shadow-none"
                      style={{
                        background: selectedVendor?.id === v.id ? "var(--accent-bg)" : "var(--bg)",
                        color: "var(--text-h)",
                        borderRadius: 0,
                      }}
                      onClick={() => selectVendor(v)}
                    >
                      <span className="text-muted me-2 small">{idx + 1}.</span>
                      <span className="fw-medium">{v.vendor_name}</span>
                      {v.phone && <span className="text-muted small ms-2">{v.phone}</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Enter quantities */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status"></div>
          <div className="text-muted mt-2 small">Loading menu items...</div>
        </div>
      ) : selectedVendor && foods.length === 0 ? (
        <div className="text-center py-5 bg-white rounded shadow-sm border border-light-subtle">
          <i className="bi bi-egg fs-1 text-muted d-block mb-2"></i>
          <div className="text-muted">No menu items registered for {selectedVendor.vendor_name}.</div>
          <small className="text-muted">
            Add foods first under the "Vendors" tab.
          </small>
        </div>
      ) : foods.length > 0 ? (
        <>
          <div
            className="d-flex align-items-center gap-2 p-3 mb-3 rounded"
            style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)" }}
          >
            <i className="bi bi-truck text-success fs-5"></i>
            <div className="small text-dark">
              Enter the quantities delivered today. Leftovers will be keyed in at closing.
            </div>
          </div>

          {/* Food quantity cards */}
          <div className="d-flex flex-column gap-3 mb-3">
            {foods.map((food, index) => (
              <div
                key={food.id}
                className="card border border-light-subtle shadow-sm card-kpi"
                style={{ borderRadius: "8px" }}
              >
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <div className="fw-bold text-dark">{food.food_name}</div>
                      <div className="text-muted small">
                        Supplier price: <span className="text-success fw-bold">RM {Number(food.vendor_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 mt-2">
                    <input
                      type="number"
                      min="0"
                      className="form-control form-control-lg fw-bold text-center shadow-none"
                      style={{
                        borderRadius: "8px",
                        fontSize: "1.4rem",
                        width: "110px",
                        border: food.qty !== "" && Number(food.qty) > 0 ? "2px solid var(--accent)" : "1px solid var(--border)",
                      }}
                      placeholder="0"
                      value={food.qty}
                      onChange={(e) => handleQtyChange(index, e.target.value)}
                    />
                    <span className="text-muted small">units delivered</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total display card */}
          {totalDeliveredUnits > 0 && (
            <div className="card border-0 bg-success text-white shadow-sm mb-4" style={{ borderRadius: "8px" }}>
              <div className="card-body p-3 d-flex justify-content-between align-items-center">
                <span className="fw-semibold">Total items to log:</span>
                <span className="fw-bold fs-5">{totalDeliveredUnits} units</span>
              </div>
            </div>
          )}

          {/* Save Delivery Button */}
          <button
            className="btn btn-success w-100 py-3 fw-bold shadow-none"
            style={{ borderRadius: "8px", fontSize: "1.05rem" }}
            onClick={saveDelivery}
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
            ) : (
              <><i className="bi bi-save me-2"></i>Save Delivery Log</>
            )}
          </button>
        </>
      ) : null}
    </div>
  );
}