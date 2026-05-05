import express from "express";
import session from "express-session";
import methodOverride from "method-override";
import webRoutes from "./routes/webRoutes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { csrfMiddleware, verifyCsrf } from "./middleware/csrf.js";
dotenv.config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// method override
app.use(methodOverride("_method"));

app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "changeme",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax" }
}));

// CSRF
app.use(csrfMiddleware);
app.use(verifyCsrf);

// EJS
app.set("view engine", "ejs");

// Health check
app.get("/health", (req, res) => {
  console.log("Health endpoint called");
  res.json({
    status: "ok",
    service: "insighta-frontend",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// routes
app.use("/", webRoutes);

export default app;