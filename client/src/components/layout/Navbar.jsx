import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("vendorbb_theme") === "dark"
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("vendorbb_theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("vendorbb_theme", "light");
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem("vendorbb_token");
    localStorage.removeItem("vendorbb_user");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-dark bg-success shadow-sm px-3 py-2">
      <div className="container-fluid d-flex justify-content-between align-items-center position-relative">
        <span
          className="navbar-brand fw-bold m-0 d-flex align-items-center gap-2 cursor-pointer"
          style={{ letterSpacing: "-0.5px", cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          <img
            src="/logo.png?v=2"
            alt="Bukuh Blako Logo"
            style={{
              height: "32px",
              objectFit: "contain",
              filter: "drop-shadow(0 0 8px rgba(30, 174, 71, 0.25))"
            }}
          />
          VendorBB
        </span>

        {/* Desktop Navigation Links */}
        <div className="d-none d-md-flex gap-3 position-absolute start-50 translate-middle-x">
          <NavLink to="/" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Dashboard</NavLink>
          <NavLink to="/vendors" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Vendors</NavLink>
          <NavLink to="/foods" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Foods</NavLink>
          <NavLink to="/delivery" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Delivery</NavLink>
          <NavLink to="/closing" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Closing</NavLink>
          <NavLink to="/payments" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Payments</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `text-decoration-none px-2 py-1 small fw-semibold transition-all ${isActive ? "text-white border-bottom border-white" : "text-white-50"}`}>Reports</NavLink>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Settings Button */}
          <button
            className="btn btn-success border border-white-50 btn-sm d-flex align-items-center justify-content-center"
            onClick={() => navigate("/more")}
            title="Settings & Tools"
            style={{ width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
          >
            <i className="bi bi-gear" style={{ color: "#fff" }}></i>
          </button>

          {/* Theme Toggle Button */}
          <button
            className="btn btn-success border border-white-50 btn-sm d-flex align-items-center justify-content-center"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ width: "32px", height: "32px", borderRadius: "50%", padding: 0 }}
          >
            <i className={`bi bi-${darkMode ? "sun" : "moon"}`} style={{ color: "#fff" }}></i>
          </button>

          {/* Logout Button */}
          <button
            className="btn btn-outline-light btn-sm d-flex align-items-center gap-1 ms-1"
            onClick={handleLogout}
            title="Log Out"
          >
            <i className="bi bi-box-arrow-right"></i>
            <span className="d-none d-sm-inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}