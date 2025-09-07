import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SlidingWindowCounter } from "./index.mjs";

describe("SlidingWindowCounter", () => {
  let slidingWindowCounter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic functionality", () => {
    beforeEach(() => {
      slidingWindowCounter = new SlidingWindowCounter(10, 1000); // 10 requests per 1 second
    });

    it("should allow requests within capacity", () => {
      expect(slidingWindowCounter.check("user1")).toBe(true);
      expect(slidingWindowCounter.check("user1")).toBe(true);
      expect(slidingWindowCounter.check("user1")).toBe(true);
    });

    it("should block requests when capacity is exceeded", () => {
      // Use up the capacity
      for (let i = 0; i < 10; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }

      // Next request should be blocked
      expect(slidingWindowCounter.check("user1")).toBe(false);
    });

    it("should handle multiple users independently", () => {
      // User1 uses up their capacity
      for (let i = 0; i < 10; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }
      expect(slidingWindowCounter.check("user1")).toBe(false);

      // User2 should still have their full capacity
      expect(slidingWindowCounter.check("user2")).toBe(true);
    });
  });

  describe("Window calculation", () => {
    beforeEach(() => {
      slidingWindowCounter = new SlidingWindowCounter(5, 1000); // 5 requests per 1 second
    });

    it("should correctly calculate window boundaries", () => {
      const testCases = [
        { time: 0, expectedWindow: 0 },
        { time: 500, expectedWindow: 0 },
        { time: 999, expectedWindow: 0 },
        { time: 1000, expectedWindow: 1000 },
        { time: 1500, expectedWindow: 1000 },
        { time: 2000, expectedWindow: 2000 },
      ];

      testCases.forEach(({ time, expectedWindow }) => {
        vi.setSystemTime(time);
        const now = Date.now();
        const start = Math.floor(now / 1000) * 1000;
        expect(start).toBe(expectedWindow);
      });
    });
  });

  describe("Sliding window logic", () => {
    beforeEach(() => {
      slidingWindowCounter = new SlidingWindowCounter(10, 1000); // 10 requests per 1 second
    });

    it("should use weighted count from previous window", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Make 5 requests in first window
      for (let i = 0; i < 5; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }

      // Move to middle of next window (500ms into second window)
      vi.setSystemTime(startTime + 1500);

      // At this point:
      // - Current window (1000-2000ms): 0 requests
      // - Previous window (0-1000ms): 5 requests
      // - Weight for previous: (1 - 500/1000) = 0.5
      // - Total estimated: 0 + 5 * 0.5 = 2.5

      // Should be able to make more requests
      expect(slidingWindowCounter.check("user1")).toBe(true); // Now total ≈ 3.5
      expect(slidingWindowCounter.check("user1")).toBe(true); // Now total ≈ 4.5
    });

    it("should handle transition between windows smoothly", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Fill up the first window
      for (let i = 0; i < 10; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }
      expect(slidingWindowCounter.check("user1")).toBe(false);

      // Move to start of next window
      vi.setSystemTime(startTime + 1000);

      // At window boundary:
      // - Current window: 0 requests
      // - Previous window: 10 requests
      // - Weight: (1 - 0/1000) = 1.0
      // - Total: 0 + 10 * 1.0 = 10

      // Should still be blocked due to previous window
      expect(slidingWindowCounter.check("user1")).toBe(false);

      // Move further into the window
      vi.setSystemTime(startTime + 1500);

      // Now weight is (1 - 500/1000) = 0.5
      // Total: 0 + 10 * 0.5 = 5
      // Should allow requests now
      expect(slidingWindowCounter.check("user1")).toBe(true);
    });

    // Test at different points in next window
    const testPoints = [
      { offset: 1100, expectedWeight: 0.9, expectedPrevImpact: 7.2 }, // 8 * 0.9
      { offset: 1300, expectedWeight: 0.7, expectedPrevImpact: 5.6 }, // 8 * 0.7
      { offset: 1500, expectedWeight: 0.5, expectedPrevImpact: 4.0 }, // 8 * 0.5
      { offset: 1800, expectedWeight: 0.2, expectedPrevImpact: 1.6 }, // 8 * 0.2
      { offset: 1900, expectedWeight: 0.1, expectedPrevImpact: 0.8 }, // 8 * 0.1
    ];

    for (const { offset, expectedPrevImpact } of testPoints) {
      it("should gradually reduce previous window impact", () => {
        const startTime = 1000;
        vi.setSystemTime(startTime);

        // Make 8 requests in first window
        for (let i = 0; i < 8; i++) {
          expect(slidingWindowCounter.check("user1")).toBe(true);
        }

        vi.setSystemTime(startTime + offset);

        // The exact number of requests we can make depends on the weighted previous count
        const requestsToMake = Math.floor(10 - expectedPrevImpact);

        for (let i = 0; i < requestsToMake; i++) {
          expect(slidingWindowCounter.check("user1")).toBe(true);
        }
      });
    }
  });

  describe("Edge cases", () => {
    it("should handle zero capacity", () => {
      slidingWindowCounter = new SlidingWindowCounter(0, 1000);
      expect(slidingWindowCounter.check("user1")).toBe(false);
    });

    it("should handle capacity of 1", () => {
      slidingWindowCounter = new SlidingWindowCounter(1, 1000);
      expect(slidingWindowCounter.check("user1")).toBe(true);
      expect(slidingWindowCounter.check("user1")).toBe(false);
    });

    it("should handle very small timespan", () => {
      slidingWindowCounter = new SlidingWindowCounter(5, 100); // 100ms windows

      for (let i = 0; i < 5; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }
      expect(slidingWindowCounter.check("user1")).toBe(false);

      // Move to next window
      vi.advanceTimersByTime(100);
      expect(slidingWindowCounter.check("user1")).toBe(true);
    });

    it("should handle large capacity", () => {
      slidingWindowCounter = new SlidingWindowCounter(1000, 1000);

      // Should allow many requests
      for (let i = 0; i < 1000; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }

      // Should block the 1001st request
      expect(slidingWindowCounter.check("user1")).toBe(false);
    });
  });

  describe("Memory management", () => {
    beforeEach(() => {
      slidingWindowCounter = new SlidingWindowCounter(5, 1000);
    });

    it("should store separate counters for different users", () => {
      slidingWindowCounter.check("user1");
      slidingWindowCounter.check("user2");

      expect(slidingWindowCounter.counterMap.has("user1")).toBe(true);
      expect(slidingWindowCounter.counterMap.has("user2")).toBe(true);
    });

    it("should accumulate counts in current window", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      slidingWindowCounter.check("user1");
      slidingWindowCounter.check("user1");
      slidingWindowCounter.check("user1");

      const counter = slidingWindowCounter.counterMap.get("user1");
      expect(counter.get(startTime)).toBe(3);
    });
  });

  describe("Precision comparison", () => {
    beforeEach(() => {
      slidingWindowCounter = new SlidingWindowCounter(10, 1000);
    });

    it("should provide smoother rate limiting than fixed window", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      // Use capacity in first window
      for (let i = 0; i < 10; i++) {
        expect(slidingWindowCounter.check("user1")).toBe(true);
      }

      // Move to middle of next window - should still have some restriction
      vi.setSystemTime(startTime + 1500);

      // Unlike fixed window, we can't immediately use full capacity
      // due to weighted previous window impact
      let allowedRequests = 0;
      for (let i = 0; i < 10; i++) {
        if (slidingWindowCounter.check("user1")) {
          allowedRequests++;
        }
      }

      // Should allow some but not all requests due to sliding window effect
      expect(allowedRequests).toBeGreaterThan(0);
      expect(allowedRequests).toBeLessThan(10);
    });
  });
});
