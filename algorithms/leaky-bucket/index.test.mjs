import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LeakyBucket, Handler } from "./index.mjs";

describe("LeakyBucket", () => {
  let leakyBucket;
  let mockHandler;

  beforeEach(() => {
    vi.useFakeTimers();
    mockHandler = {
      active: false,
      run: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Basic functionality", () => {
    beforeEach(() => {
      leakyBucket = new LeakyBucket(3, 0.001); // 3 capacity, 1 drain per second
    });

    it("should add items to queue when capacity allows", () => {
      expect(leakyBucket.add("request1")).toBe(true);
      expect(leakyBucket.add("request2")).toBe(true);
      expect(leakyBucket.add("request3")).toBe(true);
      expect(leakyBucket.queue).toHaveLength(3);
    });

    it("should reject items when queue is at capacity", () => {
      // Fill to capacity
      expect(leakyBucket.add("request1")).toBe(true);
      expect(leakyBucket.add("request2")).toBe(true);
      expect(leakyBucket.add("request3")).toBe(true);

      // Should reject next request
      expect(leakyBucket.add("request4")).toBe(false);
      expect(leakyBucket.queue).toHaveLength(3);
    });

    it("should allow adding after draining", () => {
      // Fill to capacity
      leakyBucket.add("request1");
      leakyBucket.add("request2");
      leakyBucket.add("request3");

      // Subscribe a handler
      leakyBucket.subcribe(mockHandler);

      // Advance time to allow draining
      vi.advanceTimersByTime(1000);

      // Should be able to add new request after draining
      expect(leakyBucket.add("request4")).toBe(true);
    });
  });

  describe("Handler subscription", () => {
    beforeEach(() => {
      leakyBucket = new LeakyBucket(3, 0.001);
    });

    it("should subscribe handlers", () => {
      leakyBucket.subcribe(mockHandler);
      expect(leakyBucket.handlders).toContain(mockHandler);
    });

    it("should unsubscribe handlers", () => {
      leakyBucket.subcribe(mockHandler);
      leakyBucket.unsubscribe(mockHandler);
      expect(leakyBucket.handlders).not.toContain(mockHandler);
    });
  });

  describe("Draining functionality", () => {
    beforeEach(() => {
      leakyBucket = new LeakyBucket(2, 0.001); // 2 capacity, 1 drain per second
    });

    it("should drain items when time passes and handlers are available", () => {
      // Add items to queue
      leakyBucket.add("request1");
      leakyBucket.add("request2");

      // Subscribe handler
      leakyBucket.subcribe(mockHandler);

      // Advance time by 1 second to allow 1 drain
      vi.advanceTimersByTime(1000);

      // Trigger drain by adding new item
      leakyBucket.add("request3");

      // Should have processed 1 item
      expect(mockHandler.run).toHaveBeenCalledWith("request1");
    });

    it("should not drain more items than available handlers", () => {
      const handler1 = { active: false, run: vi.fn() };
      const handler2 = { active: false, run: vi.fn() };

      // Add 3 items
      leakyBucket.add("request1");
      leakyBucket.add("request2");
      leakyBucket.add("request3");

      // Subscribe only 2 handlers
      leakyBucket.subcribe(handler1);
      leakyBucket.subcribe(handler2);

      // Advance time by 3 seconds (should allow 3 drains)
      vi.advanceTimersByTime(3000);

      // Trigger drain
      leakyBucket.drain();

      // Should only process 2 items (limited by handler count)
      expect(handler1.run).toHaveBeenCalledTimes(1);
      expect(handler2.run).toHaveBeenCalledTimes(1);
    });

    it("should not drain when no time has passed", () => {
      leakyBucket.add("request1");
      leakyBucket.subcribe(mockHandler);

      // Don't advance time
      leakyBucket.drain();

      expect(mockHandler.run).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases", () => {
    it("should handle zero capacity bucket", () => {
      leakyBucket = new LeakyBucket(0, 0.001);
      expect(leakyBucket.add("request1")).toBe(false);
    });

    it("should handle zero drain rate", () => {
      leakyBucket = new LeakyBucket(2, 0);
      leakyBucket.add("request1");
      leakyBucket.subcribe(mockHandler);

      // Even after time passes, nothing should drain with 0 rate
      vi.advanceTimersByTime(5000);
      leakyBucket.drain();

      expect(mockHandler.run).not.toHaveBeenCalled();
    });

    it("should handle draining with no handlers subscribed", () => {
      leakyBucket = new LeakyBucket(2, 0.001);
      leakyBucket.add("request1");

      vi.advanceTimersByTime(1000);

      // Should not throw error when draining with no handlers
      expect(() => leakyBucket.drain()).not.toThrow();
    });
  });
});

describe("Handler", () => {
  let handler;

  beforeEach(() => {
    handler = new Handler();
  });

  it("should initialize with active = false", () => {
    expect(handler.active).toBe(false);
  });

  it("should set active to true during run and back to false", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    handler.run("test-key");

    expect(consoleSpy).toHaveBeenCalledWith("running key: test-key");
    expect(handler.active).toBe(false); // Should be false after run completes

    consoleSpy.mockRestore();
  });

  it("should allow setting active state", () => {
    handler.active = true;
    expect(handler.active).toBe(true);

    handler.active = false;
    expect(handler.active).toBe(false);
  });
});
