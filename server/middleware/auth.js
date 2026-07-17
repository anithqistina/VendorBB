const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Allow public requests
  if (req.method === "OPTIONS") {
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access Denied: Sign in required" });
  }

  try {
    const secret = process.env.JWT_SECRET || "vendorbb_jwt_secret_key";
    const verified = jwt.verify(token, secret);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Session expired or invalid. Please login again." });
  }
};
