import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If token exists, direct to home
    if (localStorage.getItem("vendorbb_token")) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { username, password });
      localStorage.setItem("vendorbb_token", res.data.token);
      localStorage.setItem("vendorbb_user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED" || !err.response) {
        setError(`Cannot connect to the backend server at "${api.defaults.baseURL}". Please ensure the backend is running and configured correctly.`);
      } else {
        setError(err.response?.data?.message || "Invalid username or password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #0d0f12 0%, #0d381a 100%)",
        fontFamily: "'Outfit', 'Segoe UI', sans-serif",
      }}
    >
      <div
        className="login-card shadow-lg border-0"
        style={{
          width: "400px",
          maxWidth: "95%",
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
        }}
      >
        <div className="card-body p-5 text-center">
          {/* Logo container with pulse animation */}
          <div className="mb-4 d-flex justify-content-center">
            <img
              src="/logo.png?v=2"
              alt="Bukuh Blako Logo"
              style={{
                height: "100px",
                objectFit: "contain",
                filter: "drop-shadow(0 0 15px rgba(30, 174, 71, 0.25))",
                animation: "pulse 3s infinite",
              }}
            />
          </div>

          <h2 className="fw-bold mb-1 text-white" style={{ letterSpacing: "-0.5px" }}>
            VendorBB
          </h2>
          <p className="text-muted-subtle mb-4" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
            Management Portal
          </p>

          {error && (
            <div
              className="alert alert-danger border-0 text-start py-2 px-3 mb-3 small"
              style={{
                background: "rgba(220, 53, 69, 0.15)",
                color: "#ff848f",
                borderRadius: "8px",
                borderLeft: "4px solid #dc3545",
              }}
            >
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="text-start">
            <div className="mb-3">
              <label className="form-label text-white-50 small fw-semibold">Username</label>
              <div className="input-group">
                <span
                  className="input-group-text border-0"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                >
                  <i className="bi bi-person"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-0 text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    outline: "none",
                    boxShadow: "none",
                  }}
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label text-white-50 small fw-semibold">Password</label>
              <div className="input-group">
                <span
                  className="input-group-text border-0"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}
                >
                  <i className="bi bi-lock"></i>
                </span>
                <input
                  type="password"
                  className="form-control border-0 text-white"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    outline: "none",
                    boxShadow: "none",
                  }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-success w-100 py-2.5 fw-bold"
              style={{
                background: "linear-gradient(135deg, #2ecc71 0%, #1eae47 100%)",
                border: "none",
                borderRadius: "8px",
                transition: "all 0.3s ease",
                boxShadow: "0 4px 15px rgba(30, 174, 71, 0.35)",
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 0.95; }
        }
        .form-control::placeholder {
          color: rgba(255,255,255,0.3) !important;
        }
        .form-control:focus {
          background: rgba(255,255,255,0.12) !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}