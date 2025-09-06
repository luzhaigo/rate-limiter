import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenBucket } from "./index.mjs";

describe("TokenBucket", () => {
  let tokenBucket;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic functionality", () => {
    beforeEach(() => {
      tokenBucket = new TokenBucket(5, 0.001); // 5 tokens capacity, 1 token per second
    });

    it("should check requests when bucket has tokens", () => {
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(true);
    });

    it("should block requests when bucket is empty", () => {
      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        expect(tokenBucket.check("user1")).toBe(true);
      }
      // Next request should be blocked
      expect(tokenBucket.check("user1")).toBe(false);
    });

    it("should handle multiple users independently", () => {
      // User1 exhausts their tokens
      for (let i = 0; i < 5; i++) {
        expect(tokenBucket.check("user1")).toBe(true);
      }
      expect(tokenBucket.check("user1")).toBe(false);

      // User2 should still have tokens
      expect(tokenBucket.check("user2")).toBe(true);
    });
  });

  describe("Token refill functionality", () => {
    beforeEach(() => {
      tokenBucket = new TokenBucket(3, 0.001); // 3 tokens capacity, 1 token per second
    });

    it("should refill tokens over time", () => {
      // Exhaust all tokens
      for (let i = 0; i < 3; i++) {
        expect(tokenBucket.check("user1")).toBe(true);
      }
      expect(tokenBucket.check("user1")).toBe(false);

      // Advance time by 2 seconds to refill 2 tokens
      vi.advanceTimersByTime(2000);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(false); // Should be blocked again
    });

    it("should not exceed bucket capacity when refilling", () => {
      const bucket = new TokenBucket(2, 0.001); // 2 tokens capacity

      // Use 1 token
      expect(bucket.check("user1")).toBe(true);

      // Advance time by 10 seconds (more than needed to fill bucket)
      vi.advanceTimersByTime(10000);

      // Should only have capacity worth of tokens (2), not more
      expect(bucket.check("user1")).toBe(true);
      expect(bucket.check("user1")).toBe(true);
      expect(bucket.check("user1")).toBe(false);
    });

    it("should handle partial token refills correctly", () => {
      tokenBucket = new TokenBucket(5, 0.0005); // 0.5 tokens per second

      // Exhaust all tokens
      for (let i = 0; i < 5; i++) {
        expect(tokenBucket.check("user1")).toBe(true);
      }
      expect(tokenBucket.check("user1")).toBe(false);

      // Advance by 1 second (should add 0.5 tokens, floored to 0)
      vi.advanceTimersByTime(1000);
      expect(tokenBucket.check("user1")).toBe(false);

      // Advance by another second (total 2 seconds = 1 token)
      vi.advanceTimersByTime(1000);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero capacity bucket", () => {
      tokenBucket = new TokenBucket(0, 0.001);
      expect(tokenBucket.check("user1")).toBe(false);
    });

    it("should handle zero refill rate", () => {
      tokenBucket = new TokenBucket(2, 0);

      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(false);

      // Even after time passes, no tokens should be refilled
      vi.advanceTimersByTime(10000);
      expect(tokenBucket.check("user1")).toBe(false);
    });

    it("should initialize new users with full bucket", () => {
      tokenBucket = new TokenBucket(3, 0.001);

      // First user gets full bucket
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(false);

      // New user should also get full bucket
      expect(tokenBucket.check("user2")).toBe(true);
      expect(tokenBucket.check("user2")).toBe(true);
      expect(tokenBucket.check("user2")).toBe(true);
      expect(tokenBucket.check("user2")).toBe(false);
    });
  });

  describe("Time handling", () => {
    beforeEach(() => {
      tokenBucket = new TokenBucket(2, 0.001);
    });

    it("should handle first request correctly when updatedAt is undefined", () => {
      expect(tokenBucket.check("user1")).toBe(true);

      // Check that subsequent requests work properly
      expect(tokenBucket.check("user1")).toBe(true);
      expect(tokenBucket.check("user1")).toBe(false);
    });

    it("should update timestamp correctly after consuming tokens", () => {
      const startTime = Date.now();
      vi.setSystemTime(startTime);

      expect(tokenBucket.check("user1")).toBe(true);

      // Advance time and make another request
      vi.advanceTimersByTime(1000);
      expect(tokenBucket.check("user1")).toBe(true);

      // Should still have 1 token left, so this should pass
      expect(tokenBucket.check("user1")).toBe(true);

      // Now the bucket should be empty
      expect(tokenBucket.check("user1")).toBe(false);
    });
  });
});
