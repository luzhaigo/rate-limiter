export class SlidingWindowCounter {
  constructor(capacity, timespan) {
    this.capacity = capacity;
    this.timespan = timespan; //  millisecond
    this.counterMap = new Map();
  }

  check(key) {
    const now = Date.now();
    const start = Math.floor(now / this.timespan) * this.timespan;
    const prevStart = start - this.timespan;
    const elapsed = now - start;
    const counter = this.counterMap.get(key) ?? new Map();
    const current = counter.get(start) ?? 0;
    const prevCount = counter.get(prevStart) ?? 0;
    const count =
      current + Math.floor(prevCount * (1 - elapsed / this.timespan));

    if (count >= this.capacity) {
      return false;
    }

    counter.set(start, current + 1);

    this.counterMap.set(key, counter);

    return true;
  }
}
