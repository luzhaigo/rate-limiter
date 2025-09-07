export class SlidingWindowLog {
  constructor(capacity, timespan) {
    this.capacity = capacity;
    this.timespan = timespan; // millisecond
    this.counterMap = new Map();
  }

  check(key) {
    const now = Date.now();
    let counter = this.counterMap.get(key) || []; // queue-based for storing timestamps

    counter = counter.filter((ts) => ts > now - this.timespan);
    counter.push(now);
    this.counterMap.set(key, counter);

    return counter.length <= this.capacity;
  }
}
