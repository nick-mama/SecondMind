import IORedis from "ioredis";

// We create ONE Redis connection and reuse it everywhere.
// Creating a new connection per request would exhaust Redis's
// connection limit very quickly
export const redis = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null, // required by BullMQ
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});
