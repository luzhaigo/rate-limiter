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
  ANS: When the request comes in, I will substract current timestamp by last updated time and multiply by refill rate, which I can get token count to replenish the bucket.

  **CORRECTION:** Your approach is correct! Just remember to cap the total tokens at the bucket capacity - you don't want to exceed the maximum allowed tokens. Also, make sure to update the "last updated time" to the current timestamp after calculating the refill.

- What happens when a user makes their first request? Initial token count setup?
  ANS: If there is no existing key in Redis, I will initiate a hash object with a key and value will be an object including token count and last updated time.

  **CORRECTION:** Good thinking! You'll typically want to initialize with the full bucket capacity (not zero tokens) so new users can immediately make requests up to their burst limit. Set token count to the maximum bucket size and last updated time to the current timestamp.

- How do you handle partial token consumption for different API endpoints?
  ANS: I assume the whole endpoints consume the same token, which means they share the same bucket.

  **CORRECTION:** That's a valid design choice for simplicity! However, in real systems, you might want different endpoints to consume different amounts of tokens (e.g., heavy operations like file uploads might consume 5 tokens while simple GET requests consume 1). You could also have separate buckets per endpoint type if needed.

**Scalability Considerations:**

- What about Redis clustering/sharding for horizontal scaling?
  ANS: for single point of failure, we can set up a redis cluster like master-slave. The write will go to master node and read will go to slave node. If we want to have read-your-writes, we can send read requests to the master node.

  **CORRECTION:** You're mixing up two concepts here. Master-slave is for high availability/failover, not horizontal scaling. For horizontal scaling, you'd use Redis Cluster mode which automatically shards data across multiple nodes based on hash slots. Each user's rate limit data would be consistently hashed to the same shard.

- How would you handle Redis failover or high availability?
  ANS: Since we create a master-slave cluster, we can add more replicas for high availabiltiy and failover.
  We can also configure Redis to have Redis database and AOF. RDB give you point-in-time snapshots and AOF give you ability to replay the logs.

  **CORRECTION:** Great answer! You understand the concepts well. Just a small note - it's "RDB" (Redis Database) not "Redis database", and you can also mention Redis Sentinel for automatic failover detection and promotion of slaves to masters.

- Consider discussing load balancing across multiple rate limiter instances
  ANS: We can leverage Redis cluster to load balance requests for us.

  **CORRECTION:** Not quite right here. Redis cluster handles data distribution, not load balancing of your rate limiter application instances. You'd need a separate load balancer (like NGINX, HAProxy, or AWS ALB) to distribute incoming requests across multiple rate limiter service instances. Each instance would then connect to the same Redis cluster.

**Configuration & Flexibility:**

- Different rate limits for different API endpoints or user tiers?
  ANS: I would ask interviewer this question before design the system.

  **CORRECTION:** Excellent approach! Clarifying requirements upfront is exactly what interviewers want to see. You could also mention how you'd handle it technically - like using composite keys in Redis (e.g., "user123:endpoint_type" or "premium_user:user123") to have different buckets for different scenarios.

- How would you configure burst capacity vs sustained rate?
  ANS: We can analyze our traffic pattern and adjust the configure to meet requirements.

  **CORRECTION:** Good thinking, but be more specific! In token bucket, burst capacity is your bucket size (max tokens), and sustained rate is your refill rate (tokens per second). You'd set bucket size based on acceptable burst traffic and refill rate based on long-term sustainable throughput.

- Dynamic rate limit adjustments based on system load?
  ANS: We can have a monitor system to track traffic and create an API endpoint to adjust configuration dynamically.

  **CORRECTION:** Perfect approach! You could also mention using configuration management systems (like Consul, etcd) or feature flags to push config changes without redeploying your rate limiter instances. Also consider circuit breaker patterns to automatically tighten limits during high load periods.

**Error Handling & Edge Cases:**

- What happens when Redis is unavailable? Fail open or closed?
  ANS: We will have a monior system to track the services and use health check endpoint at certain interval to check.

  **CORRECTION:** You're describing how to detect Redis being down, but the question is asking what to do when it happens. You need to decide: "fail open" (allow all requests through when Redis is down) or "fail closed" (block all requests when Redis is down). Most systems fail open to maintain availability, but you might fail closed for critical security endpoints. You could also implement a local fallback cache or use a simpler in-memory rate limiter as backup.

- Clock synchronization issues across distributed systems?
  **SUGGESTED ANSWER:** Use NTP (Network Time Protocol) to keep all servers synchronized. Consider using logical clocks or vector clocks for ordering events when precise timing matters. For rate limiting, small clock drifts (few seconds) usually don't significantly impact the algorithm, but large drifts could cause unfair rate limiting across different servers.

- Handling time zone considerations if needed?
  **SUGGESTED ANSWER:** Always use UTC timestamps internally for consistency across distributed systems. Only convert to local time zones when displaying data to users. Rate limiting logic should be timezone-agnostic - a user's rate limit shouldn't change based on their location or server timezone.

**Monitoring & Observability:**

- Metrics for rate limit hits, Redis performance, token bucket states?
  **SUGGESTED ANSWER:** Track key metrics like: rate limit hit rate per user/endpoint, Redis latency and connection pool usage, token bucket fill/drain rates, request accept/reject ratios. Use tools like Prometheus/Grafana for visualization. Monitor Redis memory usage and eviction rates to ensure your 9MB allocation is sufficient.

- Alerting for unusual traffic patterns or system issues?
  **SUGGESTED ANSWER:** Set up alerts for: sudden spikes in rate limit hits (potential attack), Redis unavailability or high latency, unusually high request volumes from specific IPs/users, and rate limiter service health issues. Use tools like PagerDuty or AWS CloudWatch for alerting.

- Logging strategy for debugging rate limit decisions?
  **SUGGESTED ANSWER:** Log rate limit decisions with structured logging including: user ID, IP, endpoint, timestamp, tokens consumed/remaining, decision (allow/deny), and request metadata. Use log levels appropriately - INFO for normal decisions, WARN for rate limit hits, ERROR for system issues. Consider sampling to avoid log flooding during high traffic.

**Performance Optimizations:**

- Lua scripts for atomic Redis operations?
  **SUGGESTED ANSWER:** Yes! Use Lua scripts to atomically read current tokens, calculate refill, update tokens, and return the decision in a single Redis call. This prevents race conditions and reduces network round trips. The script would handle the entire "check-and-update" operation atomically.

- Local caching to reduce Redis calls?
  **SUGGESTED ANSWER:** Implement local token caching with careful expiration. Cache user token states locally for short periods (e.g., 1-5 seconds) to reduce Redis load. However, be cautious - this can allow users to exceed limits across multiple server instances. Consider it only for non-critical rate limiting scenarios.

- Batch operations for high-throughput scenarios?
  **SUGGESTED ANSWER:** Use Redis pipelines to batch multiple rate limit checks in a single network call. For very high throughput, consider processing requests in micro-batches rather than one-by-one. You could also implement async processing where rate limit checks don't block the main request thread.

**Security Considerations:**

- How to prevent rate limit bypass attempts?
  ANS: I can lower capacity. It reduces bypass attempts and impact on our system.

  **CORRECTION:** That's one approach, but it's quite blunt and affects all legitimate users too. Better strategies include: validating request signatures/tokens to prevent spoofing, using multiple identification methods (IP + User-Agent + other headers), implementing progressive penalties for suspicious behavior, using CAPTCHAs for suspected bots, and monitoring for patterns like rapid IP switching or unusual request distributions. You want to block malicious actors without impacting genuine users.

- Handling of malicious traffic patterns?
  **SUGGESTED ANSWER:** Implement multiple layers of detection: statistical anomaly detection for unusual request patterns, behavioral analysis (e.g., requests that don't follow typical user flows), rate-based detection for distributed attacks, and integration with threat intelligence feeds. Use progressive responses like temporary rate limit tightening, CAPTCHA challenges, or IP blocking for confirmed malicious actors.

- User identification security (beyond just IP/UUID)?
  **SUGGESTED ANSWER:** Use multiple identification factors: authenticated user tokens (JWT/session), device fingerprinting (browser/device characteristics), request signatures to prevent token replay, and behavioral patterns. For anonymous users, combine IP with User-Agent, Accept headers, and other request characteristics. Consider using hashed combinations to create more unique identifiers while maintaining privacy.

Your foundation is solid, but discussing these additional aspects would demonstrate deeper system design thinking in an interview setting!
