import { useEffect, useState } from "react";
import api from "../services/api";

export default function Foods() {
  const [foods, setFoods] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [form, setForm] = useState({
    vendor_id: "",
    food_name: "",
    vendor_price: "",
    status: "active",
  });

  useEffect(() => {
    fetchFoods();
    fetchVendors();
  }, []);

  const fetchFoods = async () => {
    try {
      const res = await api.get("/foods");
      setFoods(res.data);
    } catch (err) {
      console.error("Failed to fetch foods", err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await api.get("/vendors");
      setVendors(res.data);
    } catch (err) {
      console.error("Failed to fetch vendors", err);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const openAddModal = () => {
    setEditingFood(null);
    setForm({
      vendor_id: vendors[0]?.id || "",
      food_name: "",
      vendor_price: "",
      status: "active",
    });
    setShowModal(true);
  };

  const openEditModal = (food) => {
    setEditingFood(food);
    setForm({
      vendor_id: food.vendor_id,
      food_name: food.food_name,
      vendor_price: food.vendor_price,
      status: food.status || "active",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.vendor_id || !form.food_name || !form.vendor_price) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (editingFood) {
        await api.put(`/foods/${editingFood.id}`, form);
      } else {
        await api.post("/foods", form);
      }
      fetchFoods();
      setShowModal(false);
    } catch (err) {
      console.error("Error saving food", err);
      alert("Failed to save food.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this food item?")) {
      try {
        await api.delete(`/foods/${id}`);
        fetchFoods();
      } catch (err) {
        console.error("Error deleting food", err);
        alert("Failed to delete food.");
      }
    }
  };

  // Filtering logic
  const filteredFoods = foods.filter((food) => {
    const matchesSearch = food.food_name.toLowerCase().includes(search.toLowerCase()) || 
                          food.vendor_name.toLowerCase().includes(search.toLowerCase());
    const matchesVendor = vendorFilter === "" || Number(food.vendor_id) === Number(vendorFilter);
    return matchesSearch && matchesVendor;
  });

  return (
    <div className="container mt-2 text-start">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold m-0">
          <i className="bi bi-egg me-2 text-success"></i> Food Management
        </h2>
        <button className="btn btn-success shadow-none" onClick={openAddModal}>
          <i className="bi bi-plus-lg me-1"></i> Add Food
        </button>
      </div>

      {/* Filters Card */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search food or vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <select
                className="form-select"
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
              >
                <option value="">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4">Food Name</th>
                  <th>Vendor</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th className="text-end px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFoods.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No foods found
                    </td>
                  </tr>
                ) : (
                  filteredFoods.map((food) => (
                    <tr key={food.id}>
                      <td className="px-4 fw-semibold text-dark">{food.food_name}</td>
                      <td>{food.vendor_name}</td>
                      <td>RM {Number(food.vendor_price).toFixed(2)}</td>
                      <td>
                        <span
                          className={`badge rounded-pill ${
                            food.status === "active" ? "bg-success-subtle text-success border border-success" : "bg-secondary-subtle text-secondary border border-secondary"
                          }`}
                          style={{ padding: "0.5em 0.8em" }}
                        >
                          {food.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-end px-4">
                        <button
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => openEditModal(food)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(food.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="bg-white p-4 rounded shadow-lg" style={{ width: "400px", maxWidth: "90%" }}>
            <h4 className="mb-3 fw-bold">{editingFood ? "Edit Food Item" : "Add Food Item"}</h4>

            <div className="mb-2 text-start">
              <label className="form-label small fw-semibold text-muted">Vendor *</label>
              <select
                className="form-select"
                name="vendor_id"
                value={form.vendor_id}
                onChange={handleChange}
              >
                <option value="" disabled>Select Vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-2 text-start">
              <label className="form-label small fw-semibold text-muted">Food Name *</label>
              <input
                className="form-control"
                placeholder="e.g. Karipap Kentang"
                name="food_name"
                value={form.food_name}
                onChange={handleChange}
              />
            </div>

            <div className="mb-3 text-start">
              <label className="form-label small fw-semibold text-muted">Price (RM) *</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="e.g. 0.50"
                name="vendor_price"
                value={form.vendor_price}
                onChange={handleChange}
              />
            </div>

            {editingFood && (
              <div className="mb-4 text-start">
                <label className="form-label small fw-semibold text-muted">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button className="btn btn-light" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleSave}>
                {editingFood ? "Save Changes" : "Save Food"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}