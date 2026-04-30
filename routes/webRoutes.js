import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config()

const router = express.Router();

// 🔥 AUTH MIDDLEWARE (JWT)
function ensureAuth(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.redirect("/");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.redirect("/");
  }
}

// LOGIN PAGE
router.get("/", (req, res) => {
  res.render("login", {
    backendUrl: process.env.BACKEND_URL
  });
});

// DASHBOARD
router.get("/dashboard", ensureAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    // 🔥 CALL YOUR SERVICE / DB DIRECTLY (NOT HTTP)
    const profiles = await getAllProfiles({ page });

    return res.render("dashboard", {
      user: req.user,
      profiles: profiles.data || profiles,
      page
    });

  } catch (err) {
    console.log(err);

    return res.render("dashboard", {
      user: req.user,
      profiles: [],
      page: 1
    });
  }
});


export default router;