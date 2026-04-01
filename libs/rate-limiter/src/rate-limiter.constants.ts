// Redis key format — one key per tenant (fixed-window via TTL)
export const buildRateLimitKey = (tenantId: string): string =>
    `fluxgate:rl:${tenantId}`;

// The Lua script that guarantees atomic check + increment
// export const RATE_LIMIT_LUA_SCRIPT = `
// local key       = KEYS[1]
// local limit     = tonumber(ARGV[1])
// local windowMs  = tonumber(ARGV[2])

// -- Get current count (false/nil if key does not exist)
// local current = redis.call('GET', key)
// if not current then
//   current = 0
// else
//   current = tonumber(current)
// end

// local allowed = 0
// local count   = current
// local ttl     = 0

// if current >= limit then
//   -- blocked
//   allowed = 0
//   ttl = redis.call('PTTL', key)
// else
//   -- allowed
//   allowed = 1
//   count = redis.call('INCR', key)
//   if count == 1 then
//     redis.call('PEXPIRE', key, windowMs)
//   end
//   ttl = redis.call('PTTL', key)
// end

// -- safeguard (should never be negative, but protects against edge cases)
// if ttl == -1 or ttl == -2 then
//   ttl = windowMs
// end

// return { count, allowed, ttl }
// `;

export const RATE_LIMIT_LUA_SCRIPT = `
local limit      = tonumber(ARGV[1])
local windowMs   = tonumber(ARGV[2])
local now        = tonumber(ARGV[3])

local windowIdx  = math.floor(now / windowMs)
local currKey    = KEYS[1] .. ":" .. windowIdx
local prevKey    = KEYS[1] .. ":" .. (windowIdx - 1)

local currCount  = tonumber(redis.call('GET', currKey)) or 0
local prevCount  = tonumber(redis.call('GET', prevKey)) or 0

local elapsed    = (now % windowMs) / windowMs
local weighted   = prevCount * (1 - elapsed) + currCount

local allowed    = 0
local count      = math.floor(weighted)

if weighted < limit then
  allowed  = 1
  currCount = redis.call('INCR', currKey)
  redis.call('PEXPIRE', currKey, windowMs * 2)
  count    = math.floor(prevCount * (1 - elapsed) + currCount)
end

local ttl = windowMs - (now % windowMs)

return { count, allowed, ttl }
`;
