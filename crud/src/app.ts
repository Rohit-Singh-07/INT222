import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

import userRoutes from "./routes/user.routes";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: "*",           
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(compression());

// Logging
app.use(morgan("combined"));  

// Body Parser
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health Check Route
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Main Routes
app.use("/api/users", userRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
