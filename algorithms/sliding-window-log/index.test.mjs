import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SlidingWindowLog } from "./index.mjs";

describe("SlidingWindowLog", () => {
  let slidingWindowLog;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic functionality", () => {
    beforeEach(() => {
      slidingWindowLog = new SlidingWindowLog(3, 1000); // 3 requests per 1 second
    });

    it("should allow requests within capacity", () => {
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true);
    });

    it("should block requests when capacity is exceeded", () => {
      // Use up the capacity
      expect(slidingWindowLog.check("user1")).toBe(true); // [now] -> 1 <= 3
      expect(slidingWindowLog.check("user1")).toBe(true); // [now, now] -> 2 <= 3
      expect(slidingWindowLog.check("user1")).toBe(true); // [now, now, now] -> 3 <= 3

      // Next request should be blocked
      expect(slidingWindowLog.check("user1")).toBe(false); // [now, now, now, now] -> 4 <= 3 = false
    });

    it("should handle multiple users independently", () => {
      // User1 uses up their capacity
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(false);

      // User2 should still have their full capacity
      expect(slidingWindowLog.check("user2")).toBe(true);
      expect(slidingWindowLog.check("user2")).toBe(true);
      expect(slidingWindowLog.check("user2")).toBe(true);
      expect(slidingWindowLog.check("user2")).toBe(false);
    });
  });

  describe("Sliding window functionality", () => {
    beforeEach(() => {
      slidingWindowLog = new SlidingWindowLog(2, 1000); // 2 requests per 1 second
    });

    it("should allow requests after old timestamps expire", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Use up capacity
      expect(slidingWindowLog.check("user1")).toBe(true); // [1000] -> 1 <= 2
      expect(slidingWindowLog.check("user1")).toBe(true); // [1000, 1000] -> 2 <= 2
      expect(slidingWindowLog.check("user1")).toBe(false); // [1000, 1000, 1000] -> 3 <= 2 = false

      // Move forward in time (past the window)
      vi.setSystemTime(startTime + 1001);

      // Should be able to make requests again (old timestamps filtered out)
      expect(slidingWindowLog.check("user1")).toBe(true); // [] -> [2001] -> 1 <= 2
      expect(slidingWindowLog.check("user1")).toBe(true); // [2001] -> [2001, 2001] -> 2 <= 2
      expect(slidingWindowLog.check("user1")).toBe(false); // [2001, 2001] -> [2001, 2001, 2001] -> 3 <= 2 = false
    });

    it("should handle partial window expiration", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Make first request
      expect(slidingWindowLog.check("user1")).toBe(true);

      // Move forward 500ms
      vi.setSystemTime(startTime + 500);

      // Make second request (now we're at capacity)
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(false);

      // Move forward another 501ms (total 1001ms from first request)
      vi.setSystemTime(startTime + 1001);

      // First request (1000) should have expired, but we still have [1500, 1500] + new request
      expect(slidingWindowLog.check("user1")).toBe(false); // [1500, 1500, 2001] -> 3 <= 2 = false
    });

    it("should prevent burst issues across sliding windows", () => {
      slidingWindowLog = new SlidingWindowLog(5, 2000); // 5 requests per 2 seconds
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Use up capacity quickly
      for (let i = 0; i < 5; i++) {
        expect(slidingWindowLog.check("user1")).toBe(true);
      }
      expect(slidingWindowLog.check("user1")).toBe(false);

      // Move forward 1 second (still within window)
      vi.setSystemTime(startTime + 1000);

      // Should still be blocked (no fixed window reset)
      expect(slidingWindowLog.check("user1")).toBe(false);

      // Move forward to just past the window
      vi.setSystemTime(startTime + 2001);

      // Now should allow requests again
      expect(slidingWindowLog.check("user1")).toBe(true);
    });
  });

  describe("Timestamp management", () => {
    beforeEach(() => {
      slidingWindowLog = new SlidingWindowLog(3, 1000);
    });

    it("should store and filter timestamps correctly", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      slidingWindowLog.check("user1"); // [1000]

      // Check that timestamp was stored
      let counter = slidingWindowLog.counterMap.get("user1");
      expect(counter).toContain(startTime);
      expect(counter).toHaveLength(1);

      // Move forward and add another request
      vi.setSystemTime(startTime + 500);
      slidingWindowLog.check("user1"); // [1000, 1500]

      counter = slidingWindowLog.counterMap.get("user1");
      expect(counter).toHaveLength(2);
      expect(counter).toContain(startTime);
      expect(counter).toContain(startTime + 500);

      // Move forward past first timestamp's window
      vi.setSystemTime(startTime + 1001);
      slidingWindowLog.check("user1"); // [1500, 2001] (1000 filtered out)

      // First timestamp should be filtered out
      const updatedCounter = slidingWindowLog.counterMap.get("user1");
      expect(updatedCounter).toHaveLength(2);
      expect(updatedCounter).not.toContain(startTime);
      expect(updatedCounter).toContain(startTime + 500);
      expect(updatedCounter).toContain(startTime + 1001);
    });

    it("should handle empty counter initialization", () => {
      expect(slidingWindowLog.check("newUser")).toBe(true);

      const counter = slidingWindowLog.counterMap.get("newUser");
      expect(counter).toHaveLength(1);
      expect(counter[0]).toBe(Date.now());
    });
  });

  describe("Edge cases", () => {
    it("should handle zero capacity", () => {
      slidingWindowLog = new SlidingWindowLog(0, 1000);
      expect(slidingWindowLog.check("user1")).toBe(false);
    });

    it("should handle capacity of 1", () => {
      slidingWindowLog = new SlidingWindowLog(1, 1000);
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(false);
    });

    it("should handle zero timespan", () => {
      slidingWindowLog = new SlidingWindowLog(2, 0);

      // With 0 timespan, all previous requests are immediately expired
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true); // Should still work
    });

    it("should handle very large timespan", () => {
      slidingWindowLog = new SlidingWindowLog(2, 1000000); // Very long window

      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(true);
      expect(slidingWindowLog.check("user1")).toBe(false);

      // Even after advancing time, should still be blocked
      vi.advanceTimersByTime(10000);
      expect(slidingWindowLog.check("user1")).toBe(false);
    });

    it("should handle large capacity", () => {
      slidingWindowLog = new SlidingWindowLog(1000, 1000);

      // Should allow many requests
      for (let i = 0; i < 1000; i++) {
        expect(slidingWindowLog.check("user1")).toBe(true);
      }

      // Should block the 1001st request
      expect(slidingWindowLog.check("user1")).toBe(false);
    });
  });

  describe("Memory and performance", () => {
    beforeEach(() => {
      slidingWindowLog = new SlidingWindowLog(5, 2000);
    });

    it("should clean up old timestamps automatically", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Add some requests
      for (let i = 0; i < 5; i++) {
        slidingWindowLog.check("user1");
      }

      let counter = slidingWindowLog.counterMap.get("user1");
      expect(counter).toHaveLength(5);

      // Move far into the future
      vi.setSystemTime(startTime + 10000);

      // Make a new request - should clean up all old timestamps
      slidingWindowLog.check("user1");

      counter = slidingWindowLog.counterMap.get("user1");
      expect(counter).toHaveLength(1); // Only the new request
      expect(counter[0]).toBe(startTime + 10000);
    });

    it("should maintain separate logs for different users", () => {
      slidingWindowLog.check("user1");
      slidingWindowLog.check("user2");
      slidingWindowLog.check("user1");

      expect(slidingWindowLog.counterMap.has("user1")).toBe(true);
      expect(slidingWindowLog.counterMap.has("user2")).toBe(true);
      expect(slidingWindowLog.counterMap.get("user1")).toHaveLength(2);
      expect(slidingWindowLog.counterMap.get("user2")).toHaveLength(1);
    });
  });

  describe("Precision and fairness", () => {
    beforeEach(() => {
      slidingWindowLog = new SlidingWindowLog(3, 1000);
    });

    it("should provide precise rate limiting without fixed window burst issues", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Use capacity at various times within the window
      vi.setSystemTime(startTime + 100);
      expect(slidingWindowLog.check("user1")).toBe(true); // [1100] -> 1 <= 3

      vi.setSystemTime(startTime + 300);
      expect(slidingWindowLog.check("user1")).toBe(true); // [1100, 1300] -> 2 <= 3

      vi.setSystemTime(startTime + 800);
      expect(slidingWindowLog.check("user1")).toBe(true); // [1100, 1300, 1800] -> 3 <= 3
      expect(slidingWindowLog.check("user1")).toBe(false); // [1100, 1300, 1800, 1800] -> 4 <= 3 = false

      // At 2101ms, first request (at 1100ms) should expire, but we still have 1300, 1800 + new request
      vi.setSystemTime(startTime + 1101);
      expect(slidingWindowLog.check("user1")).toBe(false); // [1300, 1800, 2101] -> 3 <= 3, but we add first so [1300, 1800, 1800, 2101] -> 4 <= 3 = false

      // Wait until 2801ms so 1800ms requests also expire
      vi.setSystemTime(startTime + 1801);
      expect(slidingWindowLog.check("user1")).toBe(true); // [2101, 2801] -> 2 <= 3 (1100, 1300, 1800, 1800 filtered out)
    });
  });
});
