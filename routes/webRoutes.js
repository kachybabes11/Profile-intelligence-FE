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
    const response = await fetch(`${backendUrl}/api/profiles?page=${page}`, {
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
      metrics: {
        totalProfiles: data.total || 0,
        totalPages: data.total_pages || 1,
        currentPage: data.page || page
      },
      profiles: data.data || [],
      page,
      error: null
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.render("dashboard", {
      user: req.user,
      metrics: {
        totalProfiles: 0,
        totalPages: 1,
        currentPage: page
      },
      profiles: [],
      page,
      error: "Failed to load dashboard data. Please try again."
    });
  }
});

router.get("/profiles", ensureAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const query = (req.query.q || "").trim();

  try {
    const backendUrl = getBackendUrl();
    const endpoint = query
      ? `${backendUrl}/api/profiles/search?q=${encodeURIComponent(query)}&page=${page}`
      : `${backendUrl}/api/profiles?page=${page}`;

    const response = await fetch(endpoint, {
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
      page,
      query,
      error: null
    });
  } catch (error) {
    console.error('Profiles error:', error);
    return res.render("profiles", {
      user: req.user,
      profiles: [],
      page,
      query,
      error: "Unable to load profiles. Please refresh the page."
    });
  }
});

router.get("/profiles/:id", ensureAuth, async (req, res) => {
  try {
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/api/profiles/${req.params.id}`, {
      headers: buildBackendHeaders(req)
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.redirect("/");
      }
      if (response.status === 404) {
        return res.render("profileDetail", {
          user: req.user,
          profile: null
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return res.render("profileDetail", {
      user: req.user,
      profile: data.data
    });
  } catch (error) {
    console.error('Profile detail error:', error);
    return res.render("profileDetail", {
      user: req.user,
      profile: null
    });
  }
});

router.get("/search", ensureAuth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const searchQuery = (req.query.q || "").trim();

  try {
    let profiles = [];
    let error = null;

    if (searchQuery) {
      const backendUrl = getBackendUrl();
      const response = await fetch(
        `${backendUrl}/api/profiles/search?q=${encodeURIComponent(searchQuery)}&page=${page}`,
        {
          headers: buildBackendHeaders(req)
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return res.redirect("/");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      profiles = data.data || [];
    }

    return res.render("search", {
      user: req.user,
      profiles,
      searchQuery,
      page,
      error: null
    });
  } catch (error) {
    console.error('Search page error:', error);
    return res.render("search", {
      user: req.user,
      profiles: [],
      searchQuery,
      page,
      error: "Search failed. Please try again."
    });
  }
});

router.get("/account", ensureAuth, (req, res) => {
  res.render("account", {
    user: req.user
  });
});

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

router.get("/auth/logout", (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.redirect('/');
});

export default router;
