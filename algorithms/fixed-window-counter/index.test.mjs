import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FixedWindowCounter } from "./index.mjs";

describe("FixedWindowCounter", () => {
  let fixedWindowCounter;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic functionality", () => {
    beforeEach(() => {
      fixedWindowCounter = new FixedWindowCounter(3); // 3 requests per second
    });

    it("should allow requests within capacity", () => {
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
    });

    it("should block requests when capacity is reached", () => {
      // Use up the capacity
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);

      // Next request should be blocked
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });

    it("should handle multiple users independently", () => {
      // User1 uses up their capacity
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);

      // User2 should still have their full capacity
      expect(fixedWindowCounter.check("user2")).toBe(true);
      expect(fixedWindowCounter.check("user2")).toBe(true);
      expect(fixedWindowCounter.check("user2")).toBe(true);
      expect(fixedWindowCounter.check("user2")).toBe(false);
    });
  });

  describe("Window reset functionality", () => {
    beforeEach(() => {
      fixedWindowCounter = new FixedWindowCounter(2); // 2 requests per second
    });

    it("should reset counter when new window starts", () => {
      const startTime = 1000; // Start at 1 second
      vi.setSystemTime(startTime);

      // Use up capacity in first window
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);

      // Move to next window (advance by 1 second)
      vi.setSystemTime(startTime + 1000);

      // Should be able to make requests again
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });

    it("should handle requests within the same window", () => {
      const startTime = 1500; // Start at 1.5 seconds
      vi.setSystemTime(startTime);

      expect(fixedWindowCounter.check("user1")).toBe(true);

      // Move forward but stay in same window (still in 1000-2000ms window)
      vi.setSystemTime(startTime + 200);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });

    it("should demonstrate burst issue at window boundaries", () => {
      const startTime = 1900; // Near end of first window
      vi.setSystemTime(startTime);

      // Use capacity at end of first window
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);

      // Move to start of next window
      vi.setSystemTime(2000);

      // Can immediately use full capacity again - this is the burst issue
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });
  });

  describe("Window boundary calculations", () => {
    beforeEach(() => {
      fixedWindowCounter = new FixedWindowCounter(1);
    });

    it("should correctly calculate window boundaries", () => {
      // Test various timestamps and their window boundaries
      const testCases = [
        { time: 0, expectedWindow: 0 },
        { time: 500, expectedWindow: 0 },
        { time: 999, expectedWindow: 0 },
        { time: 1000, expectedWindow: 1000 },
        { time: 1500, expectedWindow: 1000 },
        { time: 2000, expectedWindow: 2000 },
        { time: 2999, expectedWindow: 2000 },
      ];

      testCases.forEach(({ time, expectedWindow }) => {
        vi.setSystemTime(time);

        // Use up the capacity to verify window calculation
        expect(fixedWindowCounter.check("user1")).toBe(true);
        expect(fixedWindowCounter.check("user1")).toBe(false);

        // Check that the window start was calculated correctly
        const counter = fixedWindowCounter.counterMap.get("user1");
        expect(counter.has(expectedWindow)).toBe(true);

        // Reset for next test
        fixedWindowCounter.counterMap.clear();
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle zero capacity", () => {
      fixedWindowCounter = new FixedWindowCounter(0);
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });

    it("should handle capacity of 1", () => {
      fixedWindowCounter = new FixedWindowCounter(1);
      expect(fixedWindowCounter.check("user1")).toBe(true);
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });

    it("should handle large capacity", () => {
      fixedWindowCounter = new FixedWindowCounter(1000);

      // Should allow many requests
      for (let i = 0; i < 1000; i++) {
        expect(fixedWindowCounter.check("user1")).toBe(true);
      }

      // Should block the 1001st request
      expect(fixedWindowCounter.check("user1")).toBe(false);
    });

    it("should handle new users correctly", () => {
      fixedWindowCounter = new FixedWindowCounter(2);

      // First request from new user should always succeed
      expect(fixedWindowCounter.check("newUser")).toBe(true);
      expect(fixedWindowCounter.check("newUser")).toBe(true);
      expect(fixedWindowCounter.check("newUser")).toBe(false);
    });
  });

  describe("Memory management", () => {
    beforeEach(() => {
      fixedWindowCounter = new FixedWindowCounter(1);
    });

    it("should store separate counters for different users", () => {
      fixedWindowCounter.check("user1");
      fixedWindowCounter.check("user2");

      expect(fixedWindowCounter.counterMap.has("user1")).toBe(true);
      expect(fixedWindowCounter.counterMap.has("user2")).toBe(true);
      expect(fixedWindowCounter.counterMap.size).toBe(2);
    });

    it("should accumulate window data over time", () => {
      const startTime = 1000;
      vi.setSystemTime(startTime);

      fixedWindowCounter.check("user1");

      // Move to next window
      vi.setSystemTime(startTime + 1000);
      fixedWindowCounter.check("user1");

      // Should have data for both windows
      const counter = fixedWindowCounter.counterMap.get("user1");
      expect(counter.size).toBe(2); // Two different window timestamps
    });
  });
});
