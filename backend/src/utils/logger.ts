import pino from "pino";
import { env } from "./env";

const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});

export const wsLog = logger.child({ scope: "ws" });
export const gameLog = logger.child({ scope: "game" });

export default logger;
