import { config } from "../config.js";

class RedisClient {
  private readonly url: string;
  private readonly headers: Record<string, string>;

  constructor() {
    this.url = config.UPSTASH_REDIS_REST_URL.replace(/\/$/, "");
    this.headers = {
      Authorization: `Bearer ${config.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  private async execute<T>(command: unknown[]): Promise<T | null> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
    const data = (await res.json()) as { result?: T; error?: string };
    if (data.error) throw new Error(`Redis: ${data.error}`);
    return data.result ?? null;
  }

  async get(key: string): Promise<string | null> {
    return this.execute<string>(["GET", key]);
  }

  async set(key: string, value: string, exSeconds?: number): Promise<boolean> {
    const cmd: unknown[] = ["SET", key, value];
    if (exSeconds) cmd.push("EX", exSeconds);
    const res = await this.execute<string>(cmd);
    return res === "OK";
  }

  async del(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    return (await this.execute<number>(["DEL", ...keys])) ?? 0;
  }

  async incr(key: string): Promise<number> {
    return (await this.execute<number>(["INCR", key])) ?? 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    return (await this.execute<number>(["EXPIRE", key, seconds])) ?? 0;
  }

  async ttl(key: string): Promise<number> {
    return (await this.execute<number>(["TTL", key])) ?? -1;
  }

  async jsonSet<T>(key: string, value: T, exSeconds?: number): Promise<boolean> {
    return this.set(key, JSON.stringify(value), exSeconds);
  }

  async jsonGet<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // pub/sub via Upstash REST (fire-and-forget publish)
  async publish(channel: string, message: string): Promise<number> {
    return (await this.execute<number>(["PUBLISH", channel, message])) ?? 0;
  }
}

export const redis = new RedisClient();
