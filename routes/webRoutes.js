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
      `${backendUrl}/api/profiles?page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${req.cookies.accessToken}`,
          "x-api-version": "1"
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

// CREATE PROFILE (admin only - proxy to backend)
router.post("/profiles", ensureAuth, async (req, res) => {
  try {
    const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    const response = await fetch(`${backendUrl}/api/v1/profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${req.cookies.accessToken}`,
        "Content-Type": "application/json",
        "x-api-version": "1"
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).send(err.message || "Failed to create profile");
    }

    return res.redirect("/dashboard");
  } catch (error) {
    return res.redirect("/dashboard");
  }
});

// DELETE PROFILE (admin only - proxy to backend)
router.delete("/profiles/:id", ensureAuth, async (req, res) => {
  try {
    const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    const response = await fetch(`${backendUrl}/api/v1/profiles/${req.params.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${req.cookies.accessToken}`,
        "x-api-version": "1"
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).send(err.message || "Failed to delete profile");
    }

    return res.redirect("/dashboard");
  } catch (error) {
    return res.redirect("/dashboard");
  }
});

// EXPORT CSV (admin only - proxy to backend)
router.get("/profiles/export", ensureAuth, async (req, res) => {
  try {
    const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    const response = await fetch(`${backendUrl}/api/v1/profiles/export`, {
      headers: {
        Authorization: `Bearer ${req.cookies.accessToken}`,
        "x-api-version": "1"
      }
    });

    if (!response.ok) {
      return res.redirect("/dashboard");
    }

    const csvData = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=profiles.csv");
    return res.send(csvData);
  } catch (error) {
    return res.redirect("/dashboard");
  }
});

// LOGOUT
router.get("/auth/logout", (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return res.redirect("/");
});

export default router;
