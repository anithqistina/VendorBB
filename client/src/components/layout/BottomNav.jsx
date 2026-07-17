import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const menus = [
    {
      title: "Home",
      icon: "bi-house",
      path: "/",
    },
    {
      title: "Vendors",
      icon: "bi-people",
      path: "/vendors",
    },
    {
      title: "Delivery",
      icon: "bi-truck",
      path: "/delivery",
    },
    {
      title: "Closing",
      icon: "bi-check2-circle",
      path: "/closing",
    },
    {
      title: "Payment",
      icon: "bi-wallet2",
      path: "/payments",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bg)",
        borderTop: "1px solid var(--border)",
        justifyContent: "space-around",
        padding: "10px 0",
        zIndex: 1000,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
      }}
      className="d-flex d-md-none d-print-none"
    >
      {menus.map((menu, index) => (
        <NavLink
          key={index}
          to={menu.path}
          style={({ isActive }) => ({
            textDecoration: "none",
            color: isActive ? "#1eae47" : "#6c757d",
            textAlign: "center",
            fontWeight: isActive ? "bold" : "normal",
            transition: "color 0.2s ease",
          })}
        >
          <div>
            <i className={`bi ${menu.icon}`} style={{ fontSize: "1.2rem", display: "block" }}></i>
          </div>
          <small style={{ fontSize: "0.75rem" }}>{menu.title}</small>
        </NavLink>
      ))}
    </div>
  );
}