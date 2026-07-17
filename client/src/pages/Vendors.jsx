import { useEffect, useState } from "react";
import api from "../services/api";
import { showToast } from "../services/toast";

const EMPTY_VENDOR = { vendor_name: "", phone: "", whatsapp: "", bank_name: "", account_number: "", bank_holder_name: "" };

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");

  // Add/Edit Vendor Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorForm, setVendorForm] = useState(EMPTY_VENDOR);
  const [savingVendor, setSavingVendor] = useState(false);

  // Foods lists inside form
  const [formFoods, setFormFoods] = useState([]); // Array of { food_name, vendor_price }
  const [newFoodInput, setNewFoodInput] = useState({ food_name: "", vendor_price: "" });
  const [editingFoodId, setEditingFoodId] = useState(null);
  const [editFoodInput, setEditFoodInput] = useState({ food_name: "", vendor_price: "" });

  // Vendor Detail Drawer Modal (click row)
  const [detailVendor, setDetailVendor] = useState(null);
  const [detailFoods, setDetailFoods] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(false);

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try {
      const res = await api.get("/vendors");
      setVendors(res.data);
    } catch { showToast("Failed to load vendors list", "error"); }
  };

  const fetchVendorFoods = async (vendor) => {
    setDetailVendor(vendor);
    setDetailFoods([]);
    setLoadingFoods(true);
    try {
      const res = await api.get(`/vendors/${vendor.id}/foods`);
      setDetailFoods(res.data);
    } catch { showToast("Failed to load food menu", "error"); }
    finally { setLoadingFoods(false); }
  };

  // --- Vendor CRUD Actions ---
  const openAddVendor = () => {
    setEditingVendor(null);
    setVendorForm(EMPTY_VENDOR);
    setFormFoods([]);
    setNewFoodInput({ food_name: "", vendor_price: "" });
    setShowVendorModal(true);
  };

  const openEditVendor = async (v, e) => {
    if (e) e.stopPropagation();
    setEditingVendor(v);
    setVendorForm({
      vendor_name: v.vendor_name,
      phone: v.phone || "",
      whatsapp: v.whatsapp || "",
      bank_name: v.bank_name || "",
      account_number: v.account_number || "",
      bank_holder_name: v.bank_holder_name || ""
    });
    setNewFoodInput({ food_name: "", vendor_price: "" });
    setFormFoods([]);
    setShowVendorModal(true);

    // Fetch existing foods to show in form
    try {
      const res = await api.get(`/vendors/${v.id}/foods`);
      setFormFoods(res.data);
    } catch {
      showToast("Failed to retrieve vendor foods", "error");
    }
  };

  const saveVendor = async () => {
    if (!vendorForm.vendor_name.trim()) { showToast("Vendor name is required", "warning"); return; }
    
    setSavingVendor(true);
    try {
      if (editingVendor) {
        // 1. Update vendor details
        await api.put(`/vendors/${editingVendor.id}`, vendorForm);
        showToast("Vendor details updated!");
        if (detailVendor?.id === editingVendor.id) {
          setDetailVendor({ ...detailVendor, ...vendorForm });
          fetchVendorFoods({ id: editingVendor.id, ...vendorForm });
        }
      } else {
        // 1. Create new vendor
        const res = await api.post("/vendors", vendorForm);
        const newVendorId = res.data.vendorId || res.data.insertId;

        // 2. Insert all temporary foods
        if (formFoods.length > 0 && newVendorId) {
          await Promise.all(formFoods.map(food =>
            api.post("/foods", {
              vendor_id: newVendorId,
              food_name: food.food_name,
              vendor_price: Number(food.vendor_price)
            })
          ));
        }
        showToast("Vendor and food menu added successfully!");
      }
      fetchVendors();
      setShowVendorModal(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to save vendor details", "error");
    } finally {
      setSavingVendor(false);
    }
  };

  const deleteVendor = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this vendor? This will also remove all associated food menus and delivery logs.")) return;
    try {
      await api.delete(`/vendors/${id}`);
      showToast("Vendor deleted", "info");
      if (detailVendor?.id === id) setDetailVendor(null);
      fetchVendors();
    } catch { showToast("Failed to delete vendor", "error"); }
  };

  // --- Inline Food CRUD Actions (Inside Modal) ---
  const handleAddFoodToForm = async () => {
    if (!newFoodInput.food_name.trim()) { showToast("Food name is required", "warning"); return; }
    if (!newFoodInput.vendor_price || isNaN(newFoodInput.vendor_price)) { showToast("Enter a valid supplier price", "warning"); return; }

    const foodItem = {
      food_name: newFoodInput.food_name,
      vendor_price: Number(newFoodInput.vendor_price)
    };

    if (editingVendor) {
      // For existing vendor: save to DB instantly
      try {
        await api.post("/foods", {
          vendor_id: editingVendor.id,
          food_name: foodItem.food_name,
          vendor_price: foodItem.vendor_price
        });
        showToast("Food item added!");
        
        // Refresh local list
        const res = await api.get(`/vendors/${editingVendor.id}/foods`);
        setFormFoods(res.data);
      } catch {
        showToast("Failed to save new food item", "error");
      }
    } else {
      // For new vendor: save to local list temporary
      setFormFoods([...formFoods, foodItem]);
    }

    setNewFoodInput({ food_name: "", vendor_price: "" });
  };

  const handleRemoveFoodFromForm = async (index, foodId) => {
    if (editingVendor && foodId) {
      // For existing vendor: delete from DB instantly
      if (!window.confirm("Are you sure you want to delete this food item? This will clear historical delivery entries for this item.")) return;
      try {
        await api.delete(`/foods/${foodId}`);
        showToast("Food item removed!", "info");
        setFormFoods(formFoods.filter(f => f.id !== foodId));
      } catch {
        showToast("Failed to remove food item", "error");
      }
    } else {
      // For new vendor: delete from local array
      setFormFoods(formFoods.filter((_, idx) => idx !== index));
    }
  };

  const startEditFood = (f, index) => {
    setEditingFoodId(f.id || `local-${index}`);
    setEditFoodInput({ food_name: f.food_name, vendor_price: f.vendor_price });
  };

  const cancelEditFood = () => {
    setEditingFoodId(null);
    setEditFoodInput({ food_name: "", vendor_price: "" });
  };

  const handleSaveFoodEdit = async (index, foodId) => {
    if (!editFoodInput.food_name.trim()) { showToast("Food name is required", "warning"); return; }
    if (!editFoodInput.vendor_price || isNaN(editFoodInput.vendor_price)) { showToast("Enter a valid supplier price", "warning"); return; }

    const updatedFood = {
      food_name: editFoodInput.food_name,
      vendor_price: Number(editFoodInput.vendor_price)
    };

    if (editingVendor && foodId) {
      try {
        await api.put(`/foods/${foodId}`, {
          vendor_id: editingVendor.id,
          food_name: updatedFood.food_name,
          vendor_price: updatedFood.vendor_price
        });
        showToast("Food item updated!");
        const res = await api.get(`/vendors/${editingVendor.id}/foods`);
        setFormFoods(res.data);
      } catch {
        showToast("Failed to update food item", "error");
      }
    } else {
      const temp = [...formFoods];
      temp[index] = { ...temp[index], ...updatedFood };
      setFormFoods(temp);
    }
    setEditingFoodId(null);
  };

  const filtered = vendors.filter(v =>
    v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.phone && v.phone.includes(search)) ||
    (v.bank_name && v.bank_name.toLowerCase().includes(search.toLowerCase())) ||
    (v.bank_holder_name && v.bank_holder_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container mt-2 text-start pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold m-0 text-dark">
          <i className="bi bi-people me-2 text-success"></i> Vendors List
        </h2>
        <button className="btn btn-success shadow-none" onClick={openAddVendor}>
          <i className="bi bi-plus-lg me-1"></i> Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="input-group shadow-sm">
          <span className="input-group-text bg-white border-end-0">
            <i className="bi bi-search text-muted"></i>
          </span>
          <input
            type="text"
            className="form-control border-start-0"
            placeholder="Search vendor by name, phone, bank, holder..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="text-muted small mb-2">
        <i className="bi bi-info-circle me-1"></i>
        Tap on a vendor card to view their profile, food menu, and bank details.
      </p>

      {/* Vendor List */}
      <div className="d-flex flex-column gap-2">
        {filtered.length === 0 ? (
          <div className="text-center py-5 text-muted bg-white rounded shadow-sm border border-light-subtle">
            No vendors registered yet. Please click "Add Vendor" to start.
          </div>
        ) : (
          filtered.map((v, idx) => (
            <div
              key={v.id}
              className="card shadow-sm border border-light-subtle card-kpi"
              onClick={() => fetchVendorFoods(v)}
              style={{ cursor: "pointer", borderRadius: "8px" }}
            >
              <div className="card-body py-3 px-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <span
                    className="fw-bold text-success d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: "32px", height: "32px", background: "var(--accent-bg)", borderRadius: "50%", fontSize: "0.8rem", border: "1px solid var(--accent-border)" }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: "0.95rem" }}>{v.vendor_name}</div>
                    <div className="text-muted small">{v.phone || "No phone number"}</div>
                  </div>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <span className="text-muted small d-none d-sm-block">{v.bank_name || ""}</span>
                  <button
                    className="btn btn-outline-primary btn-sm shadow-none"
                    onClick={(e) => openEditVendor(v, e)}
                    title="Edit Vendor & Foods"
                    style={{ borderRadius: "6px", padding: "4px 8px" }}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm shadow-none"
                    onClick={(e) => deleteVendor(v.id, e)}
                    title="Delete Vendor"
                    style={{ borderRadius: "6px", padding: "4px 8px" }}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== VENDOR DETAIL BOTTOM SHEET MODAL ===== */}
      {detailVendor && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 1040 }}
          onClick={() => setDetailVendor(null)}
        >
          <div
            className="position-fixed bottom-0 start-0 w-100 bg-white"
            style={{
              borderRadius: "20px 20px 0 0",
              maxHeight: "85vh",
              overflowY: "auto",
              zIndex: 1050,
              padding: "0",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="d-flex justify-content-center pt-3 pb-1">
              <div style={{ width: "40px", height: "4px", background: "#dee2e6", borderRadius: "2px" }}></div>
            </div>

            <div className="px-4 pb-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h4 className="fw-bold mb-1">{detailVendor.vendor_name}</h4>
                  <div className="text-muted small">
                    <i className="bi bi-telephone me-1"></i>{detailVendor.phone || "—"}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {detailVendor.whatsapp && (
                    <a
                      href={`https://wa.me/${detailVendor.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-success btn-sm"
                      style={{ borderRadius: "8px" }}
                    >
                      <i className="bi bi-whatsapp me-1"></i> WA
                    </a>
                  )}
                  <button className="btn btn-sm btn-light" onClick={() => setDetailVendor(null)}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>

              {/* Bank Details */}
              <div className="rounded p-3 mb-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <div className="small fw-semibold text-success mb-2">
                  <i className="bi bi-bank me-1"></i> Bank Details
                </div>
                <div className="row g-2 text-dark">
                  <div className="col-4 text-muted small">Bank Name:</div>
                  <div className="col-8 fw-semibold">{detailVendor.bank_name || "—"}</div>
                  <div className="col-4 text-muted small">Account Holder:</div>
                  <div className="col-8 fw-semibold">{detailVendor.bank_holder_name || "—"}</div>
                  <div className="col-4 text-muted small">Account No.:</div>
                  <div className="col-8 font-monospace fw-semibold">{detailVendor.account_number || "—"}</div>
                </div>
              </div>

              {/* Food list in details */}
              <div className="mb-3">
                <h6 className="fw-bold text-dark">
                  <i className="bi bi-egg me-1 text-success"></i> Food Menu List
                </h6>
              </div>

              {loadingFoods ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success" role="status"></div>
                </div>
              ) : detailFoods.length === 0 ? (
                <div className="text-center py-4 text-muted bg-light rounded border">
                  No food items added for this vendor.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {detailFoods.map(f => (
                    <div
                      key={f.id}
                      className="d-flex justify-content-between align-items-center p-3 rounded border bg-light"
                    >
                      <span className="fw-semibold text-dark">{f.food_name}</span>
                      <span className="fw-bold text-success">RM {Number(f.vendor_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <button
                  className="btn btn-outline-success w-100 py-2.5 fw-bold shadow-none"
                  onClick={() => { openEditVendor(detailVendor); setDetailVendor(null); }}
                >
                  <i className="bi bi-pencil me-2"></i> Manage Vendor & Food List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== UNIFIED ADD/EDIT VENDOR & FOOD MODAL ===== */}
      {showVendorModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-end align-items-end"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 1060 }}
          onClick={() => setShowVendorModal(false)}
        >
          <div
            className="bg-white w-100"
            style={{
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px 32px",
              maxHeight: "92vh",
              overflowY: "auto"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="d-flex justify-content-center mb-3">
              <div style={{ width: "40px", height: "4px", background: "#dee2e6", borderRadius: "2px" }}></div>
            </div>
            
            <h5 className="fw-bold mb-4">
              {editingVendor ? (
                <><i className="bi bi-pencil me-2 text-success"></i> Edit Vendor & Food List</>
              ) : (
                <><i className="bi bi-plus-circle me-2 text-success"></i> Add Vendor & Menu</>
              )}
            </h5>

            {/* Vendor Profile Section */}
            <h6 className="fw-bold text-success mb-3 text-uppercase small">1. Vendor Profile</h6>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-muted">Vendor Name *</label>
              <input
                className="form-control"
                style={{ borderRadius: "10px", padding: "10px" }}
                placeholder="e.g. Kak Ani Nasi Lemak"
                value={vendorForm.vendor_name}
                onChange={e => setVendorForm({ ...vendorForm, vendor_name: e.target.value })}
              />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold text-muted">Phone Number</label>
                <input
                  className="form-control"
                  style={{ borderRadius: "10px", padding: "10px" }}
                  placeholder="0123456789"
                  value={vendorForm.phone}
                  onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })}
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold text-muted">WhatsApp Number</label>
                <input
                  className="form-control"
                  style={{ borderRadius: "10px", padding: "10px" }}
                  placeholder="60123456789"
                  value={vendorForm.whatsapp}
                  onChange={e => setVendorForm({ ...vendorForm, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-4">
                <label className="form-label small fw-semibold text-muted">Bank Name</label>
                <input
                  className="form-control"
                  style={{ borderRadius: "10px", padding: "10px" }}
                  placeholder="e.g. Maybank"
                  value={vendorForm.bank_name}
                  onChange={e => setVendorForm({ ...vendorForm, bank_name: e.target.value })}
                />
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold text-muted">Bank Holder Name</label>
                <input
                  className="form-control"
                  style={{ borderRadius: "10px", padding: "10px" }}
                  placeholder="Holder Name"
                  value={vendorForm.bank_holder_name}
                  onChange={e => setVendorForm({ ...vendorForm, bank_holder_name: e.target.value })}
                />
              </div>
              <div className="col-4">
                <label className="form-label small fw-semibold text-muted">Account Number</label>
                <input
                  className="form-control"
                  style={{ borderRadius: "10px", padding: "10px" }}
                  placeholder="Account No."
                  value={vendorForm.account_number}
                  onChange={e => setVendorForm({ ...vendorForm, account_number: e.target.value })}
                />
              </div>
            </div>

            <hr className="my-4" />

            {/* Food Menu Section */}
            <h6 className="fw-bold text-success mb-3 text-uppercase small">2. Food Menu & Supplier Price</h6>
            
            {/* Add Food Input Row */}
            <div className="bg-light p-3 rounded mb-3 border">
              <label className="form-label small fw-semibold text-muted mb-2">Add New Menu Item</label>
              <div className="row g-2">
                <div className="col-7">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Food Name (e.g. Nasi Lemak)"
                    value={newFoodInput.food_name}
                    onChange={e => setNewFoodInput({ ...newFoodInput, food_name: e.target.value })}
                  />
                </div>
                <div className="col-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control form-control-sm"
                    placeholder="Price (RM)"
                    value={newFoodInput.vendor_price}
                    onChange={e => setNewFoodInput({ ...newFoodInput, vendor_price: e.target.value })}
                  />
                </div>
                <div className="col-2">
                  <button
                    className="btn btn-success btn-sm w-100 fw-bold"
                    onClick={handleAddFoodToForm}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* List of foods already added */}
            <div className="mb-4">
              <label className="form-label small fw-semibold text-muted d-block mb-2">Registered Menu Items</label>
              {formFoods.length === 0 ? (
                <div className="text-center py-3 text-muted border border-dashed rounded small">
                  No food menu items added yet. Use the inputs above to add items.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {formFoods.map((f, index) => {
                    const isEditingThisFood = editingFoodId === f.id || editingFoodId === `local-${index}`;
                    return (
                      <div
                        key={f.id || index}
                        className="d-flex justify-content-between align-items-center p-2.5 rounded border bg-light small"
                      >
                        {isEditingThisFood ? (
                          <div className="d-flex gap-2 w-100 align-items-center">
                            <div className="col-6">
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Food Name"
                                value={editFoodInput.food_name}
                                onChange={e => setEditFoodInput({ ...editFoodInput, food_name: e.target.value })}
                              />
                            </div>
                            <div className="col-3">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="form-control form-control-sm"
                                placeholder="Price"
                                value={editFoodInput.vendor_price}
                                onChange={e => setEditFoodInput({ ...editFoodInput, vendor_price: e.target.value })}
                              />
                            </div>
                            <div className="col-3 d-flex gap-1 justify-content-end">
                              <button
                                className="btn btn-sm btn-success px-2 py-1 shadow-none"
                                onClick={() => handleSaveFoodEdit(index, f.id)}
                                title="Save Edit"
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-light px-2 py-1 shadow-none border"
                                onClick={cancelEditFood}
                                title="Cancel Edit"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <span className="fw-semibold text-dark me-2">{index + 1}. {f.food_name}</span>
                              <span className="text-success fw-bold">RM {Number(f.vendor_price).toFixed(2)}</span>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-link text-primary p-0 shadow-none"
                                onClick={() => startEditFood(f, index)}
                                title="Edit item price"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-link text-danger p-0 shadow-none"
                                onClick={() => handleRemoveFoodFromForm(index, f.id)}
                                title="Remove item"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Buttons */}
            <div className="d-flex gap-2 mt-4">
              <button className="btn btn-light flex-fill py-2.5" style={{ borderRadius: "10px" }} onClick={() => setShowVendorModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-success flex-fill py-2.5 fw-bold"
                style={{ borderRadius: "10px" }}
                onClick={saveVendor}
                disabled={savingVendor}
              >
                {savingVendor ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                ) : (
                  editingVendor ? "Save Changes" : "Save Vendor & Menu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}