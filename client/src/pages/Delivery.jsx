import { useEffect, useState } from "react";
import api from "../services/api";
import { showToast } from "../services/toast";

export default function Delivery() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [foods, setFoods] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for viewing/editing existing delivery logs
  const [isEditing, setIsEditing] = useState(false);
  const [existingDeliveryId, setExistingDeliveryId] = useState(null);
  const [editDeliveryDate, setEditDeliveryDate] = useState("");

  useEffect(() => {
    loadVendors();
  }, [deliveryDate]);

  const loadVendors = async () => {
    try {
      const res = await api.get(`/deliveries/vendors?date=${deliveryDate}`);
      setVendors(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load vendors list", "error");
    }
  };

  const toggleVendor = async (vendor) => {
    if (vendorId === vendor.id) {
      // Collapse
      setVendorId("");
      setSelectedVendor(null);
      setFoods([]);
      setIsEditing(false);
      setExistingDeliveryId(null);
    } else {
      // Expand
      setSelectedVendor(vendor);
      setVendorId(vendor.id);
      await loadExistingDelivery(vendor.id, deliveryDate);
    }
  };

  const handleDateChange = async (newDate) => {
    setDeliveryDate(newDate);
    if (vendorId) {
      await loadExistingDelivery(vendorId, newDate);
    }
  };

  const loadExistingDelivery = async (id, date) => {
    if (!id || !date) return;
    setLoading(true);
    try {
      const res = await api.get(`/deliveries/today/${id}/${date}`);
      if (res.data && res.data.length > 0) {
        const existingItems = res.data;
        const deliveryId = existingItems[0].delivery_id;

        // Fetch registered foods for this vendor to match and allow adding foods not initially in this delivery log
        const foodsRes = await api.get(`/deliveries/foods/${id}`);
        const merged = foodsRes.data.map(food => {
          const match = existingItems.find(item => item.food_id === food.id);
          return {
            ...food,
            qty: match ? String(match.qty_delivered) : ""
          };
        });
        setFoods(merged);
        setIsEditing(true);
        setExistingDeliveryId(deliveryId);
        setEditDeliveryDate(date);
      } else {
        const foodsRes = await api.get(`/deliveries/foods/${id}`);
        setFoods(foodsRes.data.map(food => ({ ...food, qty: "" })));
        setIsEditing(false);
        setExistingDeliveryId(null);
        setEditDeliveryDate(date);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load delivery details", "error");
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
      const finalDate = isEditing ? editDeliveryDate : deliveryDate;
      await api.post("/deliveries", {
        delivery_id: existingDeliveryId,
        vendor_id: vendorId,
        delivery_date: finalDate,
        items
      });
      
      showToast(isEditing ? "✅ Delivery updated successfully!" : "✅ Delivery logged successfully!", "success");
      
      const prevVendorId = vendorId;
      if (deliveryDate !== finalDate) {
        setDeliveryDate(finalDate);
      }
      
      await loadVendors();
      // Keep selected vendor open and reload their data
      await loadExistingDelivery(prevVendorId, finalDate);
    } catch (err) {
      console.error(err);
      showToast("Failed to save delivery records", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="container mt-2 text-start pb-5" style={{ maxWidth: "600px" }}>
      <h2 className="fw-bold mb-4">
        <i className="bi bi-truck me-2 text-success"></i> Daily Delivery
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
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
      </div>

      {/* Search Input for Flat Vendor List */}
      <div className="mb-3">
        <div className="input-group shadow-sm" style={{ borderRadius: "8px", overflow: "hidden" }}>
          <span className="input-group-text bg-white border-end-0 text-muted">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0 ps-0 shadow-none py-2.5"
            placeholder="Search vendor by name..."
            value={vendorSearch}
            onChange={e => setVendorSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Step 2: Flat list of vendors with inline expansion */}
      <div className="d-flex flex-column gap-2">
        {filteredVendors.length === 0 ? (
          <div className="text-center text-muted py-5 bg-white rounded shadow-sm border border-light-subtle">
            No vendors found
          </div>
        ) : (
          filteredVendors.map((v, idx) => {
            const isSelected = vendorId === v.id;
            const hasDelivery = v.delivery_id !== null && v.delivery_id !== undefined;
            const isClosed = v.is_closed === 1;

            return (
              <div
                key={v.id}
                className={`card shadow-sm transition-all border ${isSelected ? "border-success" : "border-light-subtle"}`}
                style={{ borderRadius: "8px", overflow: "hidden" }}
              >
                {/* Vendor Header */}
                <div
                  className="card-header p-3 border-0 d-flex justify-content-between align-items-center"
                  style={{
                    background: isSelected ? "var(--accent-bg)" : "var(--bg)",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleVendor(v)}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold text-dark">{v.vendor_name}</span>
                  </div>
                  <div>
                    {hasDelivery ? (
                      isClosed ? (
                        <span className="badge bg-success-subtle text-success border border-success-subtle py-1 px-2 small">
                          <i className="bi bi-check-circle me-1"></i>Closed
                        </span>
                      ) : (
                        <span className="badge bg-info-subtle text-info border border-info-subtle py-1 px-2 small">
                          <i className="bi bi-truck me-1"></i>Delivered
                        </span>
                      )
                    ) : (
                      <span className="badge bg-light text-muted border border-light-subtle py-1 px-2 small">
                        Not Keyed
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Inline Logging Form */}
                {isSelected && (
                  <div className="card-body p-3 bg-white border-top">
                    {/* Move Date Section if editing */}
                    {isEditing && (
                      <div className="card shadow-none border border-warning-subtle mb-3 p-3 bg-warning-subtle-light" style={{ borderRadius: "8px", background: "#fffdf5" }}>
                        <label className="form-label small fw-semibold text-warning text-uppercase d-flex align-items-center gap-1 mb-1">
                          <i className="bi bi-calendar2-range"></i> Move Delivery Date
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          style={{ borderRadius: "8px", fontWeight: "600" }}
                          value={editDeliveryDate}
                          onChange={(e) => setEditDeliveryDate(e.target.value)}
                        />
                        <div className="form-text text-muted small mt-1">
                          Shift this delivery record to a different date.
                        </div>
                      </div>
                    )}

                    {/* Food Items Quantities */}
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                        <div className="text-muted mt-1 small">Loading menu items...</div>
                      </div>
                    ) : foods.length === 0 ? (
                      <div className="text-center py-4 bg-light rounded">
                        <i className="bi bi-egg fs-3 text-muted d-block mb-1"></i>
                        <div className="text-muted small">No menu items registered.</div>
                      </div>
                    ) : (
                      <>
                        {isEditing && (
                          <div
                            className="d-flex align-items-center gap-2 p-2.5 mb-3 rounded border small"
                            style={{ background: "#fffdf5", borderColor: "#fde68a", color: "#78350f" }}
                          >
                            <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                            <div>
                              <strong>Edit Mode:</strong> Delivery already logged. Saving will update quantities and reset closing.
                            </div>
                          </div>
                        )}

                        {/* Food cards */}
                        <div className="d-flex flex-column gap-2 mb-3">
                          {foods.map((food, index) => (
                            <div key={food.id} className="p-3 border rounded border-light-subtle bg-light">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <div className="fw-semibold text-dark small">{food.food_name}</div>
                                  <div className="text-success fw-bold small">RM {Number(food.vendor_price).toFixed(2)}</div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    className="form-control text-center shadow-none form-control-lg"
                                    style={{
                                      borderRadius: "8px",
                                      fontWeight: "700",
                                      width: "90px",
                                      border: food.qty !== "" && Number(food.qty) > 0 ? "2px solid var(--accent)" : "1px solid var(--border)",
                                      fontSize: "1.2rem"
                                    }}
                                    placeholder="0"
                                    value={food.qty}
                                    onChange={(e) => handleQtyChange(index, e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Save button */}
                        <button
                          className="btn btn-success w-100 py-3 fw-bold shadow-none"
                          style={{ borderRadius: "8px" }}
                          onClick={saveDelivery}
                          disabled={saving}
                        >
                          {saving ? (
                            <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                          ) : isEditing ? (
                            <><i className="bi bi-save me-2"></i>Update Delivery</>
                          ) : (
                            <><i className="bi bi-save me-2"></i>Save Delivery</>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}