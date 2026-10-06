import { Redis } from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("connect", () => logger.info("✅ Redis connected"));
redis.on("error", (err) => logger.error("Redis error:", err));

// ─── Cache helpers ───────────────────────────────────────────

const PERMISSIONS_TTL = 60 * 5; // 5 minutes

export const cacheKeys = {
  userPermissions: (userId: string) => `perms:${userId}`,
  refreshToken: (token: string) => `rt:${token}`,
};

export async function cacheUserPermissions(
  userId: string,
  permissions: string[]
): Promise<void> {
  await redis.setex(
    cacheKeys.userPermissions(userId),
    PERMISSIONS_TTL,
    JSON.stringify(permissions)
  );
}

export async function getCachedUserPermissions(
  userId: string
): Promise<string[] | null> {
  const data = await redis.get(cacheKeys.userPermissions(userId));
  return data ? (JSON.parse(data) as string[]) : null;
}

export async function invalidateUserPermissions(userId: string): Promise<void> {
  await redis.del(cacheKeys.userPermissions(userId));
}
