import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { redis } from "./config/redis";
import { logger } from "./utils/logger";
import { initSocket } from "./lib/socket";

async function bootstrap() {
  // ── DB connections ──────────────────────────────────────
  await prisma.$connect();
  logger.info("✅ PostgreSQL connected");

  await redis.connect();

  // ── HTTP server (needed for Socket.io) ──────────────────
  const httpServer = createServer(app);

  // ── Socket.io ───────────────────────────────────────────
  initSocket(httpServer);

  // ── Listen ──────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 API running   → http://localhost:${env.PORT}`);
    logger.info(`🔌 Socket.io     → ws://localhost:${env.PORT}`);
    logger.info(`❤️  Health check  → http://localhost:${env.PORT}/health`);
    logger.info(`📌 Environment   → ${env.NODE_ENV}`);
  });

  // ── Graceful shutdown ───────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received — shutting down gracefully...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      await redis.quit();
      logger.info("✅ All connections closed. Bye!");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
