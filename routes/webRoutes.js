import express from "express";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Validate token against backend so frontend does not depend on JWT secret parity.
async function ensureAuth(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.redirect("/");
  }

  try {
    const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    const meResponse = await fetch(`${backendUrl}/insighta/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!meResponse.ok) {
      return res.redirect("/");
    }

    req.user = await meResponse.json();
    return next();
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
    const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    const response = await fetch(
      `${backendUrl}/api/v1/profiles?page=${page}`,
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
