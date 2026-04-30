import crypto from "crypto";

// Generate a CSRF token and store in session (double-submit session pattern).
// Sets a non-httpOnly cookie so client JS can read it for AJAX requests.
export function csrfMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  // Make token available to templates
  res.locals.csrfToken = req.session.csrfToken;

  // Set a readable cookie so the CLI / SPA can include it in headers
  res.cookie("csrf-token", req.session.csrfToken, {
    httpOnly: false,
    sameSite: "strict",
    path: "/"
  });

  next();
}

// Validate CSRF token on state-changing requests
export function verifyCsrf(req, res, next) {
  const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  const tokenFromHeader = req.headers["x-csrf-token"];
  const tokenFromBody = req.body?._csrf;
  const submitted = tokenFromHeader || tokenFromBody;

  if (!submitted || submitted !== req.session?.csrfToken) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
}
