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

// body parser
app.use(express.urlencoded({ extended: true }));

// static
app.use(express.static("public"));

// method override
app.use(methodOverride("_method"));

// ✅ COOKIE PARSER (IMPORTANT for JWT auth)
app.use(cookieParser());

// session (still OK if you're using passport elsewhere)
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

// routes
app.use("/", webRoutes);

export default app;