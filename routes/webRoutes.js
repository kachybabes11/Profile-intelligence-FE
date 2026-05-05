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

async function ensureAuth(req, res, next) {
  try {
    const backendUrl = getBackendUrl();
    const meResponse = await fetch(`${backendUrl}/insighta/me`, {
      headers: buildBackendHeaders(req)
    });

    if (!meResponse.ok) {
      return res.redirect("/");
    }

    req.user = await meResponse.json();
    return next();
  } catch (err) {
    console.error('Authentication validation failed:', err);
    return res.redirect("/");
  }
}

router.get("/", (req, res) => {
  res.render("login", {
    oauthUrl: `${getBackendUrl()}/auth/github`
  });
});

router.get("/auth/callback", (req, res) => {
  const { accessToken, refreshToken } = req.query;
  const isProduction = process.env.NODE_ENV === "production";

  if (accessToken && refreshToken) {
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
  }

  return res.redirect("/dashboard");
});

router.get("/dashboard", ensureAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;

  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/profiles?page=${page}`, {
      headers: buildBackendHeaders(req)
    });

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

router.get("/profiles/search", ensureAuth, async (req, res) => {
  const query = req.query.q || '';
  const page = parseInt(req.query.page) || 1;

  if (!query.trim()) {
    return res.redirect('/dashboard');
  }

  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/profiles/search?q=${encodeURIComponent(query)}&page=${page}`, {
      headers: buildBackendHeaders(req)
    });

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

router.post("/profiles", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildBackendHeaders(req)
      },
      body: JSON.stringify({ name: req.body.name })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Create profile error:', error);
    return res.redirect('/dashboard?error=create_failed');
  }
});

router.delete("/profiles/:id", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/profiles/${req.params.id}`, {
      method: 'DELETE',
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return res.redirect('/dashboard');
  } catch (error) {
    console.error('Delete profile error:', error);
    return res.redirect('/dashboard?error=delete_failed');
  }
});

router.get("/export", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/v1/profiles/export`, {
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvData = await response.text();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="profiles.csv"');
    return res.send(csvData);
  } catch (error) {
    console.error('Export error:', error);
    return res.redirect('/dashboard?error=export_failed');
  }
});

router.get("/auth/logout", (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.redirect('/');
});

export default router;
