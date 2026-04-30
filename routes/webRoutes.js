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
  const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");

  res.render("login", {
    oauthUrl: `${backendUrl}/auth/github`
  });
});

// FRONTEND AUTH CALLBACK
router.get("/auth/callback", (req, res) => {
  const { accessToken, refreshToken } = req.query;

  if (!accessToken || !refreshToken) {
    return res.redirect("/");
  }

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/"
  });

  return res.redirect("/dashboard");
});

// DASHBOARD
router.get("/dashboard", ensureAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/v1/profiles?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${req.cookies.accessToken}`
        }
      }
    );

    if (!response.ok) {
      return res.redirect("/");
    }

    const data = await response.json();

    return res.render("dashboard", {
      user: req.user,
      profiles: data.data || [],
      page
    });
  } catch (error) {
    return res.redirect("/");
  }
});


export default router;