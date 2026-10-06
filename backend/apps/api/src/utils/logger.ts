import winston from "winston";
import { env } from "../config/env";

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]: ${message}${extra}`;
  })
);

const prodFormat = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "warn" : "debug",
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});
