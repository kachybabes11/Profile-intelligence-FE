import express from "express";
import session from "express-session";
import passport from "passport";
import methodOverride from "method-override";
import webRoutes from "./routes/webRoutes.js";
import cors from "cors";
import cookieParser from "cookie-parser";

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
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

// passport
app.use(passport.initialize());
app.use(passport.session());

// EJS
app.set("view engine", "ejs");

// routes
app.use("/", webRoutes);

export default app;