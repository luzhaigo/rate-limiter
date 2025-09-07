export class LeakyBucket {
  constructor(capacity, drainRate) {
    this.capacity = capacity;
    this.drainRate = drainRate; // per millisecond
    this.queue = [];
    this.handlders = [];
    this.udpatedAt = Date.now();
  }

  add(key) {
    this.drain();

    if (this.queue.length >= this.capacity) {
      return false;
    }

    this.queue.push(key);

    return true;
  }

  subcribe(handler) {
    this.handlders.push(handler);
  }

  unsubscribe(handler) {
    this.handlders = this.handlders.filter((h) => h !== handler);
  }

  drain() {
    const now = Date.now();
    const tokens = Math.min(
      this.capacity,
      Math.floor((now - this.udpatedAt) * this.drainRate)
    );

    if (tokens === 0) {
      return;
    }

    this.udpatedAt = now;

    const inactiveHandlers = this.handlders.filter((h) => !h.active);

    const leakyTokenCount = Math.min(tokens, inactiveHandlers.length);

    for (let i = 0; i < leakyTokenCount; i++) {
      const token = this.queue.shift();
      const handler = inactiveHandlers.shift();
      handler.run(token);
    }
  }
}

export class Handler {
  constructor() {
    this.active = false;
  }

  run(key) {
    this.active = true;
    console.log(`running key: ${key}`);
    this.active = false;
  }
}
