import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import BottomNav from "../components/layout/BottomNav";

export default function MainLayout() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const handleShowToast = (e) => {
      clearTimeout(timer);
      setToast(e.detail);
      timer = setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    window.addEventListener("show-toast", handleShowToast);
    return () => {
      window.removeEventListener("show-toast", handleShowToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <Navbar />

      <div className="container main-content">
        <Outlet />
      </div>

      {toast && (
        <div
          className={`custom-toast alert alert-${toast.type || "success"} border-0 shadow-lg d-flex align-items-center gap-2`}
          role="alert"
          style={{
            position: "fixed",
            right: "20px",
            zIndex: 1060,
            minWidth: "280px",
            maxWidth: "90%",
            borderRadius: "10px",
            borderLeft: `5px solid var(--bs-${toast.type || "success"})`,
          }}
        >
          <i className={`bi bi-${toast.icon || "check-circle-fill"} fs-5`}></i>
          <div>
            <h6 className="m-0 fw-bold">{toast.title || "Notification"}</h6>
            <small className="d-block">{toast.message}</small>
          </div>
        </div>
      )}

      <BottomNav />
    </>
  );
}