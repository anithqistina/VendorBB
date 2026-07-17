import { NavLink, Link } from "react-router-dom";

export default function Sidebar() {
    const menus = [
        {
            name: "Dashboard",
            path: "/"
        },
        {
            name: "Vendors",
            path: "/vendors"
        },
        {
            name: "Foods",
            path: "/foods"
        },
        {
            name: "Deliveries",
            path: "/delivery"
        },
        {
            name: "Closing",
            path: "/closing"
        },
        {
            name: "Weekly Payment",
            path: "/payments"
        }
    ];

    return (
        <div className="bg-light vh-100 border-end">
            <div className="p-3">
                <h5 className="fw-bold">Menu</h5>
                <hr />

                {/* Dynamic Nav Links */}
                {menus.map((menu, index) => (
                    <NavLink
                        key={index}
                        to={menu.path}
                        className="btn btn-outline-success w-100 mb-2"
                    >
                        {menu.name}
                    </NavLink>
                ))}

                {/* Additional Static Links */}
                <div className="d-flex flex-column mt-3 gap-2">
                    <Link to="/foods" className="text-decoration-none">🍔 Foods</Link>
                    <Link to="/delivery" className="text-decoration-none">🚚 Deliveries</Link>
                    <Link to="/closing" className="text-decoration-none">📋 Closing</Link>
                    <Link to="/payments" className="text-decoration-none">💰 Weekly Payment</Link>
                </div>
            </div>
        </div>
    );
}