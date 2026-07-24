import { useEffect, useState } from "react";
import api from "../services/api";
import { showToast } from "../services/toast";

export default function Closing() {
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
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

  const toggleVendor = async (vendor) => {
    if (vendorId === vendor.id) {
      // Collapse
      setVendorId("");
      setSelectedVendor(null);
      setFoods([]);
      setIsClosed(false);
      setExistingDeliveryId(null);
    } else {
      // Expand
      setSelectedVendor(vendor);
      setVendorId(vendor.id);
      await loadClosing(vendor.id, deliveryDate);
    }
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
      
      const prevVendorId = vendorId;
      if (deliveryDate !== finalDate) {
        setDeliveryDate(finalDate);
      }
      
      await loadVendors();
      // Keep selected vendor open and reload their data
      await loadClosing(prevVendorId, finalDate);
    } catch {
      showToast("Failed to save closing records", "error");
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
            const isClosedFlag = v.is_closed === 1;

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
                        Not Keyed
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Inline Closing Form */}
                {isSelected && (
                  <div className="card-body p-3 bg-white border-top">
                    {/* Move Date Section if editing */}
                    {existingDeliveryId && (
                      <div className="card shadow-none border border-warning-subtle mb-3 p-3 bg-warning-subtle-light" style={{ borderRadius: "8px", background: "#fffdf5" }}>
                        <label className="form-label small fw-semibold text-warning text-uppercase d-flex align-items-center gap-1 mb-1">
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
                          Shift this record to a different date.
                        </div>
                      </div>
                    )}

                    {/* Food Items & Remaining Qty */}
                    {loading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border spinner-border-sm text-success" role="status"></div>
                        <div className="text-muted mt-1 small">Loading delivery logs...</div>
                      </div>
                    ) : foods.length === 0 ? (
                      <div className="text-center py-4 bg-light rounded">
                        <i className="bi bi-inbox fs-3 text-muted d-block mb-1"></i>
                        <div className="text-muted small">No delivery logged for {v.vendor_name} on this date.</div>
                        <small className="text-muted text-xs">Log delivery first.</small>
                      </div>
                    ) : (
                      <>
                        {isClosed && (
                          <div
                            className="d-flex align-items-center gap-2 p-2.5 mb-3 rounded border small"
                            style={{ background: "#edfdf1", borderColor: "#c6f6d5", color: "#1c5c30" }}
                          >
                            <i className="bi bi-check-circle-fill text-success"></i>
                            <div>
                              <strong>Closed Mode:</strong> Closing leftovers logged. Saving will update leftovers.
                            </div>
                          </div>
                        )}

                        <div
                          className="d-flex align-items-center gap-2 p-2.5 mb-3 rounded border small"
                          style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#78350f" }}
                        >
                          <i className="bi bi-pencil text-warning"></i>
                          <div>
                            Enter leftovers. Sold units and payment are calculated automatically.
                          </div>
                        </div>

                        {/* Food cards */}
                        <div className="d-flex flex-column gap-3 mb-3">
                          {foods.map((food, index) => {
                            const sold = food.remaining !== "" ? food.qty_delivered - Number(food.remaining) : null;
                            const payment = sold !== null ? sold * food.vendor_price : null;
                            const pct = sold !== null ? Math.round((sold / food.qty_delivered) * 100) : 0;

                            return (
                              <div key={food.id} className="p-3 border rounded border-light-subtle bg-light">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <div className="fw-semibold text-dark small">{food.food_name}</div>
                                    <div className="text-success fw-bold small">RM {Number(food.vendor_price).toFixed(2)}</div>
                                  </div>
                                  <span className="badge bg-success-subtle text-success border border-success-subtle py-1">
                                    Delivered: {food.qty_delivered}
                                  </span>
                                </div>

                                <div className="d-flex align-items-center gap-2 mb-3">
                                  <input
                                    type="number"
                                    min="0"
                                    max={food.qty_delivered}
                                    className="form-control text-center shadow-none form-control-lg"
                                    style={{
                                      borderRadius: "8px",
                                      fontWeight: "700",
                                      width: "90px",
                                      border: food.remaining !== "" ? "2px solid var(--accent)" : "1px solid var(--border)",
                                      fontSize: "1.2rem"
                                    }}
                                    placeholder="0"
                                    value={food.remaining}
                                    onChange={e => changeRemaining(index, e.target.value)}
                                  />
                                  <span className="text-muted small">units left</span>
                                </div>

                                {food.remaining !== "" && (
                                  <div
                                    className="p-2.5 rounded d-flex justify-content-between text-xs"
                                    style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--text-h)" }}
                                  >
                                    <div>
                                      <div className="text-muted small">Sold</div>
                                      <div className="fw-bold text-dark">{sold}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted small">Payment Due</div>
                                      <div className="fw-bold text-success">RM {payment.toFixed(2)}</div>
                                    </div>
                                    <div>
                                      <div className="text-muted small">% Sold</div>
                                      <div className="fw-bold text-dark">{pct}%</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Grand Total display card */}
                        <div
                          className="card border-0 shadow mb-3"
                          style={{ borderRadius: "8px", background: "linear-gradient(135deg, #1eae47 0%, #16a34a 100%)" }}
                        >
                          <div className="card-body p-3 text-white">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="small opacity-75 text-xs">Total Sold</div>
                                <div className="fw-bold">{totalSold} units</div>
                              </div>
                              <div className="text-end">
                                <div className="small opacity-75 text-xs">Payout Total</div>
                                <div className="fw-bold fs-5">RM {totalPayment.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Save Button */}
                        <button
                          className="btn btn-success w-100 py-3 fw-bold shadow-none"
                          style={{ borderRadius: "8px" }}
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