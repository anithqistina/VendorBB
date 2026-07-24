import { useEffect, useState } from "react";
import api from "../services/api";
import { showToast } from "../services/toast";

export default function Closing() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // States for viewing/editing existing closing details
  const [isClosed, setIsClosed] = useState(false);
  const [existingDeliveryId, setExistingDeliveryId] = useState(null);
  const [editDeliveryDate, setEditDeliveryDate] = useState("");

  useEffect(() => {
    loadVendors();
  }, [deliveryDate]);

  const loadVendors = async () => {
    try {
      const res = await api.get(`/deliveries/vendors?date=${deliveryDate}`);
      setVendors(res.data);
    } catch {
      showToast("Failed to load vendors list", "error");
    }
  };

  const selectVendor = async (vendor) => {
    setSelectedVendor(vendor);
    setVendorId(vendor.id);
    setVendorSearch("");
    setShowVendorPicker(false);
    await loadClosing(vendor.id, deliveryDate);
  };

  const loadClosing = async (id, date) => {
    if (!id || !date) return;
    setLoading(true);
    setFoods([]);
    try {
      const res = await api.get(`/deliveries/today/${id}/${date}`);
      if (res.data && res.data.length > 0) {
        const isClosedFlag = res.data[0].is_closed === 1;
        const deliveryId = res.data[0].delivery_id;

        const data = res.data.map(item => ({
          ...item,
          remaining: isClosedFlag && item.qty_remaining !== null && item.qty_remaining !== undefined
            ? String(item.qty_remaining)
            : "",
        }));
        setFoods(data);
        setIsClosed(isClosedFlag);
        setExistingDeliveryId(deliveryId);
        setEditDeliveryDate(date);
      } else {
        setFoods([]);
        setIsClosed(false);
        setExistingDeliveryId(null);
        setEditDeliveryDate(date);
      }
    } catch {
      showToast("Failed to load delivery records", "error");
    } finally {
      setLoading(false);
    }
  };

  const changeRemaining = (index, value) => {
    const temp = [...foods];
    const valNum = value === "" ? 0 : Number(value);

    if (valNum > temp[index].qty_delivered) {
      showToast(`Remaining qty cannot exceed delivered qty (${temp[index].qty_delivered})`, "warning");
      return;
    }

    temp[index].remaining = value;
    temp[index].qty_sold = temp[index].qty_delivered - valNum;
    temp[index].payment = temp[index].qty_sold * temp[index].vendor_price;
    setFoods(temp);
  };

  const totalPayment = foods.reduce((sum, item) => sum + Number(item.payment || 0), 0);
  const totalSold = foods.reduce((sum, item) => sum + Number(item.qty_sold || 0), 0);
  const allFilled = foods.length > 0 && foods.every(f => f.remaining !== "");

  const saveClosing = async () => {
    if (!vendorId) { showToast("Please select a vendor", "warning"); return; }
    if (!allFilled) { showToast("Please fill in the remaining qty for all items", "warning"); return; }

    setSaving(true);
    try {
      const finalDate = editDeliveryDate;
      await api.put("/deliveries/closing", {
        delivery_id: existingDeliveryId,
        delivery_date: finalDate,
        items: foods.map(food => ({
          id: food.id,
          qty_delivered: food.qty_delivered,
          qty_remaining: Number(food.remaining),
          vendor_price: Number(food.vendor_price),
        }))
      });
      showToast(isClosed ? "✅ Daily closing updated successfully!" : "✅ Daily closing saved successfully!", "success");
      
      if (deliveryDate !== finalDate) {
        setDeliveryDate(finalDate);
      }
      
      await loadVendors();
      await loadClosing(vendorId, finalDate);
    } catch {
      showToast("Failed to save closing records", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.vendor_name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.phone && v.phone.includes(vendorSearch))
  );

  return (
    <div className="container mt-2 text-start pb-5" style={{ maxWidth: "600px" }}>
      <h2 className="fw-bold mb-4">
        <i className="bi bi-check2-circle me-2 text-success"></i> Daily Closing
      </h2>

      {/* Step 1: Date Picker */}
      <div className="card shadow-sm border border-light-subtle mb-3" style={{ borderRadius: "8px" }}>
        <div className="card-body">
          <label className="form-label small fw-semibold text-muted text-uppercase">
            <i className="bi bi-calendar3 me-1"></i> Closing Date
          </label>
          <input
            type="date"
            className="form-control form-control-lg"
            style={{ borderRadius: "8px", fontWeight: "600" }}
            value={deliveryDate}
            onChange={e => {
              const newDate = e.target.value;
              setDeliveryDate(newDate);
              setFoods([]);
              if (selectedVendor) loadClosing(vendorId, newDate);
            }}
          />
        </div>
      </div>

      {/* Step 2: Vendor Selector */}
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
            <div className="mt-2 border rounded border-light-subtle shadow-sm" style={{ borderRadius: "8px", overflow: "hidden" }}>
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
                  filteredVendors.map((v, idx) => {
                    const hasDelivery = v.delivery_id !== null && v.delivery_id !== undefined;
                    const isClosedFlag = v.is_closed === 1;
                    return (
                      <button
                        key={v.id}
                        className="btn w-100 text-start px-3 py-2 border-0 border-bottom shadow-none d-flex justify-content-between align-items-center"
                        style={{
                          background: selectedVendor?.id === v.id ? "var(--accent-bg)" : "var(--bg)",
                          color: "var(--text-h)",
                          borderRadius: 0,
                        }}
                        onClick={() => selectVendor(v)}
                      >
                        <div>
                          <span className="text-muted me-2 small">{idx + 1}.</span>
                          <span className="fw-medium">{v.vendor_name}</span>
                          {v.phone && <span className="text-muted small ms-2">{v.phone}</span>}
                        </div>
                        <div>
                          {hasDelivery ? (
                            isClosedFlag ? (
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
                              Empty
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Optional: Move Date Section if editing */}
      {existingDeliveryId && (
        <div className="card shadow-sm border border-warning-subtle mb-3" style={{ borderRadius: "8px", background: "#fffdf5" }}>
          <div className="card-body">
            <label className="form-label small fw-semibold text-warning text-uppercase d-flex align-items-center gap-1">
              <i className="bi bi-calendar2-range"></i> Move Delivery & Closing Date
            </label>
            <input
              type="date"
              className="form-control"
              style={{ borderRadius: "8px", fontWeight: "600" }}
              value={editDeliveryDate}
              onChange={(e) => setEditDeliveryDate(e.target.value)}
            />
            <div className="form-text text-muted small mt-1">
              Change this if you want to shift this record to a different date.
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Food Items - Enter Baki */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status"></div>
          <div className="text-muted mt-2 small">Loading delivery logs...</div>
        </div>
      ) : selectedVendor && foods.length === 0 && !loading ? (
        <div className="text-center py-5 bg-white rounded shadow-sm border border-light-subtle">
          <i className="bi bi-inbox fs-1 text-muted d-block mb-2"></i>
          <div className="text-muted">No delivery recorded for this vendor on {deliveryDate}.</div>
          <small className="text-muted">Make sure to register the daily delivery in "Daily Delivery" first.</small>
        </div>
      ) : foods.length > 0 ? (
        <>
          {isClosed && (
            <div
              className="d-flex align-items-center gap-2 p-3 mb-3 rounded border"
              style={{ background: "#edfdf1", borderColor: "#c6f6d5", color: "#1c5c30" }}
            >
              <i className="bi bi-check-circle-fill text-success fs-5"></i>
              <div className="small">
                <strong>Closed Mode:</strong> Closing leftovers have already been logged for this vendor on this date. Saving will update the leftovers.
              </div>
            </div>
          )}

          {/* Info banner */}
          <div
            className="d-flex align-items-center gap-2 p-3 mb-3 rounded"
            style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f" }}
          >
            <i className="bi bi-pencil text-warning fs-5"></i>
            <div className="small">
              <strong>Enter leftovers (remaining) only.</strong> The system will auto-calculate quantity sold and payment totals.
            </div>
          </div>

          {/* Food Cards */}
          <div className="d-flex flex-column gap-3 mb-3">
            {foods.map((food, index) => {
              const sold = food.remaining !== "" ? food.qty_delivered - Number(food.remaining) : null;
              const payment = sold !== null ? sold * food.vendor_price : null;
              const pct = sold !== null ? Math.round((sold / food.qty_delivered) * 100) : 0;

              return (
                <div
                  key={food.id}
                  className="card border border-light-subtle shadow-sm card-kpi"
                  style={{ borderRadius: "8px" }}
                >
                  <div className="card-body p-3">
                    {/* Food name + price */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <div className="fw-bold text-dark" style={{ fontSize: "1rem" }}>{food.food_name}</div>
                        <div className="text-muted small">
                          Supplier price: <span className="text-success fw-bold">RM {Number(food.vendor_price).toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                        Delivered: {food.qty_delivered}
                      </span>
                    </div>

                    {/* Baki Input */}
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Remaining (Leftover) *
                      </label>
                      <div className="d-flex align-items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max={food.qty_delivered}
                          className="form-control form-control-lg fw-bold text-center shadow-none"
                          style={{
                            borderRadius: "8px",
                            fontSize: "1.4rem",
                            width: "100px",
                            border: food.remaining !== "" ? "2px solid var(--accent)" : "1px solid var(--border)",
                          }}
                          placeholder="0"
                          value={food.remaining}
                          onChange={e => changeRemaining(index, e.target.value)}
                        />
                        <div className="text-muted small">of {food.qty_delivered} units</div>
                      </div>
                    </div>

                    {/* Auto-calculated result */}
                    {food.remaining !== "" && (
                      <div
                        className="p-3 rounded d-flex justify-content-between"
                        style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--text-h)" }}
                      >
                        <div className="text-center">
                          <div className="text-muted small">Sold</div>
                          <div className="fw-bold text-dark fs-5">{sold}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted small">Payment Due</div>
                          <div className="fw-bold text-success fs-5">RM {payment.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted small">% Sold</div>
                          <div className="fw-bold text-dark fs-5">{pct}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grand Total */}
          <div
            className="card border-0 shadow mb-4"
            style={{ borderRadius: "8px", background: "linear-gradient(135deg, #1eae47 0%, #16a34a 100%)" }}
          >
            <div className="card-body p-4 text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="small opacity-75">Total Units Sold</div>
                  <div className="fw-bold fs-5">{totalSold} units</div>
                </div>
                <div className="text-end">
                  <div className="small opacity-75">Today's Payout Total</div>
                  <div className="fw-bold" style={{ fontSize: "1.8rem" }}>RM {totalPayment.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            className="btn btn-success w-100 py-3 fw-bold shadow-none"
            style={{ borderRadius: "8px", fontSize: "1.05rem" }}
            onClick={saveClosing}
            disabled={saving || !allFilled}
          >
            {saving ? (
              <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
            ) : isClosed ? (
              <><i className="bi bi-check-circle me-2"></i>Update Closing</>
            ) : (
              <><i className="bi bi-check-circle me-2"></i>Save Closing</>
            )}
          </button>

          {!allFilled && (
            <p className="text-center text-muted small mt-2">
              <i className="bi bi-exclamation-circle me-1"></i>
              Please enter leftovers for all food items before saving.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}