export class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.refillRate = refillRate; // token per millisecond
    this.bucketMap = new Map();
  }

  check(key) {
    if (!this.bucketMap.has(key)) {
      this.bucketMap.set(key, { token: this.capacity, updatedAt: undefined });
    }
    const now = Date.now();

    const { token, updatedAt = now } = this.bucketMap.get(key);

    const diff = now - updatedAt;

    const newToken = Math.min(
      this.capacity,
      token + Math.floor(diff * this.refillRate)
    );
    if (newToken > 0) {
      this.bucketMap.set(key, { token: newToken - 1, updatedAt: now });

      return true;
    }

    return false;
  }
}
