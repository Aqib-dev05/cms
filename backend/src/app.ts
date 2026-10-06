import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/error.middleware";

import authRoutes          from "./modules/auth/auth.routes";
import usersRoutes         from "./modules/users/users.routes";
import staffRoutes         from "./modules/staff/staff.routes";
import academicRoutes      from "./modules/academic/academic.routes";
import studentsRoutes      from "./modules/students/students.routes";
import timetableRoutes     from "./modules/timetable/timetable.routes";
import attendanceRoutes    from "./modules/attendance/attendance.routes";
import examsRoutes         from "./modules/exams/exams.routes";
import financeRoutes       from "./modules/finance/finance.routes";
import libraryRoutes       from "./modules/library/library.routes";
import complaintsRoutes    from "./modules/complaints/complaints.routes";
import noticesRoutes       from "./modules/notices/notices.routes";
import admissionsRoutes    from "./modules/admissions/admissions.routes";
import notificationsRoutes from "./modules/notifications/notifications.routes";
import mediaRoutes         from "./modules/media/media.routes";
import auditRoutes         from "./modules/audit/audit.routes";
import pdfRoutes           from "./modules/pdf/pdf.routes";

const app = express();

// ─── Security ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:         env.CORS_ORIGIN,
  credentials:    true,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─── Rate Limiting ────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      300,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests. Try again later." },
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message: { success: false, message: "Too many login attempts. Try again in 15 minutes." },
});

// ─── Middleware ───────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    success:   true,
    message:   "College Management System API",
    version:   "1.0.0",
    timestamp: new Date().toISOString(),
    env:       env.NODE_ENV,
    modules: [
      "auth","users","staff","academic","students",
      "timetable","attendance","exams","finance","library",
      "complaints","notices","admissions","notifications",
      "media","audit","pdf",
    ],
  });
});

// ─── Routes ───────────────────────────────────────────────────
const API = "/api/v1";

app.use(`${API}/auth`,           authLimiter, authRoutes);
app.use(`${API}/users`,          usersRoutes);
app.use(`${API}/staff`,          staffRoutes);
app.use(`${API}/academic`,       academicRoutes);
app.use(`${API}/students`,       studentsRoutes);
app.use(`${API}/timetable`,      timetableRoutes);
app.use(`${API}/attendance`,     attendanceRoutes);
app.use(`${API}/exams`,          examsRoutes);
app.use(`${API}/finance`,        financeRoutes);
app.use(`${API}/library`,        libraryRoutes);
app.use(`${API}/complaints`,     complaintsRoutes);
app.use(`${API}/notices`,        noticesRoutes);
app.use(`${API}/admissions`,     admissionsRoutes);
app.use(`${API}/notifications`,  notificationsRoutes);
app.use(`${API}/media`,          mediaRoutes);
app.use(`${API}/audit`,          auditRoutes);
app.use(`${API}/pdf`,            pdfRoutes);

// ─── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

export default app;
