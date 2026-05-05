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
      `${process.env.BACKEND_URL}/api/profiles?page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${req.cookies.accessToken}`,
          'X-API-Version': '1'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return res.redirect("/");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return res.render("dashboard", {
      user: req.user,
      profiles: data.data || [],
      pagination: data.pagination || {},
      page,
      error: null
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.render("dashboard", {
      user: req.user,
      profiles: [],
      pagination: {},
      page,
      error: "Failed to load profiles. Please try again."
    });
  }
});

// PROFILE SEARCH
router.get("/profiles/search", ensureAuth, async (req, res) => {
  const query = req.query.q || '';
  const page = parseInt(req.query.page) || 1;

  if (!query.trim()) {
    return res.redirect('/dashboard');
  }

  try {
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/profiles/search?q=${encodeURIComponent(query)}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${req.cookies.accessToken}`,
          'X-API-Version': '1'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return res.render("dashboard", {
      user: req.user,
      profiles: data.data || [],
      pagination: data.pagination || {},
      page,
      searchQuery: query,
      error: null
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.render("dashboard", {
      user: req.user,
      profiles: [],
      pagination: {},
      page,
      searchQuery: query,
      error: "Search failed. Please try again."
    });
  }
});

// CREATE PROFILE
router.post("/profiles", ensureAuth, async (req, res) => {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.cookies.accessToken}`,
        'X-API-Version': '1'
      },
      body: JSON.stringify({
        name: req.body.name
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Create profile error:', error);
    res.redirect('/dashboard?error=create_failed');
  }
});

// DELETE PROFILE
router.delete("/profiles/:id", ensureAuth, async (req, res) => {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/profiles/${req.params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${req.cookies.accessToken}`,
        'X-API-Version': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Delete profile error:', error);
    res.redirect('/dashboard?error=delete_failed');
  }
});

// EXPORT CSV
router.get("/export", ensureAuth, async (req, res) => {
  try {
    const response = await fetch(`${process.env.BACKEND_URL}/api/profiles/export`, {
      headers: {
        'Authorization': `Bearer ${req.cookies.accessToken}`,
        'X-API-Version': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvData = await response.text();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="profiles.csv"');
    res.send(csvData);
  } catch (error) {
    console.error('Export error:', error);
    res.redirect('/dashboard?error=export_failed');
  }
});

// LOGOUT
router.get("/auth/logout", (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.redirect('/');
});


export default router;