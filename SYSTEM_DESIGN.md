# API rate Limiter design

Since it is an API rate limiter, I will utilize token bucket algorithm to implement a rate limiter.
I will expect that a middleware executes token bucket algorithm to process requests.
I will also use Redis to store token usages per user id. If there is no use id, I will fallback to IP.

## functional requirements

- able to use user id as a key to save it to Redis hash structure with the last updated time and current token count.
- It should delete the key after amount of time to keep memory usage bounded.

## Implementation

Suppose 1000 active users per day, since my implementation only stores the last updated time and current token count and user id. assuming timpstamp and token count takes 4 byte for each, and user id is uuid version 4 which takes 16 byte. It requires 24 byte for one user.
We have 1000 active users, so it requires 24000 byte per day and 24000 \* 365 = 8760000 byte per year.

I will allocate 9 MB memory storage to Redis.
I will also set expire time with clause EXP so that Redis will remove expired keys for me.

## Revised Version (Friendly Tone)

Hey! So you're tackling an API rate limiter design - nice choice going with the token bucket algorithm! It's definitely a solid pick for this kind of system.

Your core approach makes sense: using middleware to handle the rate limiting logic and Redis for storage. Smart move falling back to IP when there's no user ID - that covers both authenticated and anonymous users.

For the functional requirements, you've got the key pieces - storing user data in Redis with timestamps and token counts, plus automatic cleanup to manage memory. The token bucket approach is great because it allows for burst traffic while maintaining overall rate limits.

Your memory calculation is pretty thoughtful! Breaking it down to 24 bytes per user (4 bytes each for timestamp and token count, plus 16 bytes for UUID) shows good attention to detail. Though just a heads up - your yearly calculation assumes all 1000 users stay active every single day, which might be a bit conservative. In reality, you'd probably see some churn, but it's better to overestimate than underestimate!

Using Redis's built-in expiration (EX/EXPIRE) is a smart move - let Redis handle the cleanup automatically rather than building your own garbage collection. That's definitely the way to go.

## Review Thoughts and Missing Elements

Your design covers the fundamentals well, but here are some additional considerations that would strengthen your system design discussion:

**Algorithm Details Missing:**

- How exactly does the token bucket refill work? You mention storing "last updated time" but don't explain the refill rate calculation
- What happens when a user makes their first request? Initial token count setup?
- How do you handle partial token consumption for different API endpoints?

**Scalability Considerations:**

- What about Redis clustering/sharding for horizontal scaling?
- How would you handle Redis failover or high availability?
- Consider discussing load balancing across multiple rate limiter instances

**Configuration & Flexibility:**

- Different rate limits for different API endpoints or user tiers?
- How would you configure burst capacity vs sustained rate?
- Dynamic rate limit adjustments based on system load?

**Error Handling & Edge Cases:**

- What happens when Redis is unavailable? Fail open or closed?
- Clock synchronization issues across distributed systems?
- Handling time zone considerations if needed?

**Monitoring & Observability:**

- Metrics for rate limit hits, Redis performance, token bucket states?
- Alerting for unusual traffic patterns or system issues?
- Logging strategy for debugging rate limit decisions?

**Performance Optimizations:**

- Lua scripts for atomic Redis operations?
- Local caching to reduce Redis calls?
- Batch operations for high-throughput scenarios?

**Security Considerations:**

- How to prevent rate limit bypass attempts?
- Handling of malicious traffic patterns?
- User identification security (beyond just IP/UUID)?

Your foundation is solid, but discussing these additional aspects would demonstrate deeper system design thinking in an interview setting!
