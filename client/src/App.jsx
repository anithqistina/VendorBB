import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Dashboard from "./pages/Dashboard";
import Vendors from "./pages/Vendors";
import Foods from "./pages/Foods";
import Delivery from "./pages/Delivery";
import Closing from "./pages/Closing";
import Payments from "./pages/WeeklyPayments";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import More from "./pages/More";

// Protected Route Wrapper
function ProtectedRoute() {
  const token = localStorage.getItem("vendorbb_token");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/foods" element={<Foods />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/closing" element={<Closing />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/more" element={<More />} />
          </Route>
        </Route>

        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;