import express from "express";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const getBackendUrl = () => (process.env.BACKEND_URL || "").replace(/\/$/, "");

function buildBackendHeaders(req) {
  const headers = {
    "x-api-version": "1",
    "Content-Type": "application/json"
  };

  if (req.cookies?.accessToken) {
    headers.Authorization = `Bearer ${req.cookies.accessToken}`;
  }

  return headers;
}

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
    if (!meData || meData.status !== "success" || !meData.data) {
      return res.redirect("/");
    }

    req.user = meData.data;
    return next();
  } catch (err) {
    console.error('Auth validation failed:', err);
    return res.redirect("/");
  }
}

// ============ LOGIN PAGE ============
router.get("/", (req, res) => {
  if (req.cookies?.accessToken) {
    return res.redirect("/dashboard");
  }

  res.render("login", {
    oauthUrl: `${getBackendUrl()}/auth/github`,
    error: req.query.error || null
  });
});

// ============ AUTH CALLBACK ============
router.get("/auth/callback", (req, res) => {
  const { access_token, refresh_token } = req.query;

  if (!access_token || !refresh_token) {
    return res.redirect("/?error=missing_tokens");
  }

  res.cookie("accessToken", access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 3 * 60 * 1000,
  });

  res.cookie("refreshToken", refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 5 * 60 * 1000,
  });

  return res.redirect("/dashboard");
});

// ============ DASHBOARD ============
router.get("/dashboard", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/profiles?limit=5`, {
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
        return res.render("dashboard", {
      user: req.user,
      profiles: data.data || [],
      page: page || 1,
      metrics: {
        totalProfiles: data.total || (data.data?.length ?? 0),
        currentPage: page || 1
      },
      error: null
    });
  } catch (error) {
    console.error('Dashboard error:', error);
      return res.render("dashboard", {
      user: req.user,
      profiles: [],
      page: page || 1,
      metrics: {
        totalProfiles: 0,
        currentPage: page || 1
      },
      error: "Failed to load dashboard. Please try again."
    });
  }
});

// ============ PROFILES LIST ============
router.get("/profiles", ensureAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const query = req.query.q || '';

  try {
    const backendUrl = getBackendUrl();
    let url = `${backendUrl}/api/profiles?page=${page}&limit=10`;
    
    if (query.trim()) {
      url = `${backendUrl}/api/profiles/search?q=${encodeURIComponent(query)}&page=${page}&limit=10`;
    }

    const response = await fetch(url, {
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.redirect("/");
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return res.render("profiles", {
      user: req.user,
      profiles: data.data || [],
      pagination: data.pagination || {},
      page,
      query,
      error: null
    });
  } catch (error) {
    console.error('Profiles error:', error);
    return res.render("profiles", {
      user: req.user,
      profiles: [],
      pagination: {},
      page,
      query: '',
      error: "Failed to load profiles. Please try again."
    });
  }
});

// ============ PROFILE DETAIL ============
router.get("/profiles/:id", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/profiles/${req.params.id}`, {
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).render("error", {
          user: req.user,
          message: "Profile not found"
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return res.render("profile-detail", {
      user: req.user,
      profile: data.data || data,
      error: null
    });
  } catch (error) {
    console.error('Profile detail error:', error);
    return res.status(500).render("error", {
      user: req.user,
      message: "Failed to load profile. Please try again."
    });
  }
});

// ============ CREATE PROFILE (ADMIN) ============
router.post("/profiles", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/profiles`, {
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

    return res.redirect('/profiles');
  } catch (error) {
    console.error('Create profile error:', error);
    return res.redirect('/profiles?error=create_failed');
  }
});

// ============ DELETE PROFILE (ADMIN) ============
router.delete("/profiles/:id", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/profiles/${req.params.id}`, {
      method: 'DELETE',
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return res.redirect('/profiles');
  } catch (error) {
    console.error('Delete profile error:', error);
    return res.redirect('/profiles?error=delete_failed');
  }
});

// ============ EXPORT PROFILES (ADMIN) ============
router.get("/export", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/profiles/export`, {
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
    return res.redirect('/profiles?error=export_failed');
  }
});

// ============ ACCOUNT PAGE ============
router.get("/account", ensureAuth, async (req, res) => {
  return res.render("account", {
    user: req.user,
    error: null
  });
});

// ============ LOGOUT ============
router.post("/auth/logout", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    await fetch(`${backendUrl}/auth/logout`, {
      method: 'POST',
      headers: buildBackendHeaders(req)
    });
  } catch (err) {
    console.error('Logout error:', err);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.redirect('/');
});

router.get("/auth/logout", (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.redirect('/');
});

export default router;
