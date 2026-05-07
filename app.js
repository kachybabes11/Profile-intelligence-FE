import express from "express";
import methodOverride from "method-override";
import webRoutes from "./routes/webRoutes.js";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// method override
app.use(methodOverride("_method"));

app.use(cookieParser());
app.use(csurf({ cookie: true }));

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