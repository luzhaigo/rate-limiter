export class FixedWindowCounter {
  constructor(capacity) {
    this.capacity = capacity; // requests per millisecond
    this.counterMap = new Map();
  }

  check(key) {
    const counter = this.counterMap.get(key) ?? new Map();
    const now = Date.now();
    const start = Math.floor(now / 1_000) * 1_000;

    const count = counter.get(start) ?? 0;
    if (count === this.capacity) {
      return false;
    }

    counter.set(start, count + 1);

    this.counterMap.set(key, counter);

    return true;
  }
}
