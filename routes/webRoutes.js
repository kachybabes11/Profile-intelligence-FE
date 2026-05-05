import express from "express";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const getBackendUrl = () => (process.env.BACKEND_URL || "").replace(/\/$/, "");

function buildBackendHeaders(req) {
  const headers = {
    "x-api-version": "1"
  };

  if (req.cookies?.accessToken) {
    headers.Authorization = `Bearer ${req.cookies.accessToken}`;
  }

  if (req.headers?.cookie) {
    headers.Cookie = req.headers.cookie;
  }

  return headers;
}

// =====================
// LOGIN PAGE ONLY
// =====================
router.get("/", (req, res) => {
  if (req.cookies?.accessToken) {
    return res.redirect("/dashboard");
  }

  res.render("login", {
    oauthUrl: `${getBackendUrl()}/auth/github`,
    error: req.query.error || null
  });
});

// =====================
// AUTH CHECK
// =====================
async function ensureAuth(req, res, next) {
  try {
    const backendUrl = getBackendUrl();

    const meResponse = await fetch(`${backendUrl}/auth/me`, {
      headers: buildBackendHeaders(req)
    });

    if (!meResponse.ok) {
      return res.redirect("/");
    }

    const meData = await meResponse.json();

    if (!meData?.data) {
      return res.redirect("/");
    }

    req.user = meData.data;
    return next();
  } catch (err) {
    console.error(err);
    return res.redirect("/");
  }
}

// =====================
// DASHBOARD
// =====================
router.get("/dashboard", ensureAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  const backendUrl = getBackendUrl();

  const response = await fetch(`${backendUrl}/api/profiles?page=${page}`, {
    headers: buildBackendHeaders(req)
  });

  const data = await response.json();

  return res.render("dashboard", {
    user: req.user,
    profiles: data.data || [],
    page,
    metrics: {
      totalProfiles: data.total || 0,
      totalPages: data.total_pages || 1
    }
  });
});

export default router;
