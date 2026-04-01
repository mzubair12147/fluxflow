// The result every consume() call returns
export interface RateLimitResult {
    allowed: boolean;
    limit: number; // total quota for this window
    remaining: number; // requests left
    resetAt: number; // unix timestamp — when the window resets
    retryAfter?: number; // only present when blocked — seconds until retry
}

// What the Lua script returns raw from Redis
// (you'll parse this into RateLimitResult)
export interface LuaScriptResult {
    count: number;
    allowed: boolean;
    ttl: number; // milliseconds until window expires
}

// Input to consume()
export interface RateLimitContext {
    tenantId: string;
    limit: number; // from the tenant's plan
    windowSeconds: number; // from the tenant's plan
}

// What the fallback service tracks per tenant in memory
export interface FallbackBucket {
    count: number;
    windowStart: number; // unix timestamp
}
