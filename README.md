# Rate Limiter Learning Repository

This repository is a comprehensive learning project focused on understanding and implementing various rate limiting algorithms in JavaScript. Each algorithm is implemented from scratch with detailed explanations, unit tests, and performance analysis.

## 🎯 Purpose

This project serves as a hands-on exploration of rate limiting concepts, helping to understand:

- Different rate limiting strategies and their trade-offs
- Implementation details and edge cases
- Memory vs precision considerations
- Real-world applicability of each algorithm

## 🧪 Implemented Algorithms

### 1. **Token Bucket**

- **Location**: `algorithms/token-bucket/`
- **Concept**: Maintains a bucket of tokens that refill at a steady rate
- **Strengths**: Excellent burst handling, allows accumulated tokens during quiet periods
- **Use Cases**: API rate limiting, burst-tolerant scenarios

### 2. **Leaky Bucket**

- **Location**: `algorithms/leaky-bucket/`
- **Concept**: Processes requests at a steady rate using a queue-based approach
- **Strengths**: Smooth traffic flow, predictable resource usage
- **Use Cases**: Traffic shaping, downstream service protection

### 3. **Fixed Window Counter**

- **Location**: `algorithms/fixed-window-counter/`
- **Concept**: Counts requests within fixed time windows
- **Strengths**: Simple implementation, low memory usage
- **Weakness**: Burst issues at window boundaries
- **Use Cases**: Basic rate limiting, simple quota systems

### 4. **Sliding Window Log**

- **Location**: `algorithms/sliding-window-log/`
- **Concept**: Stores exact timestamps of requests for precise rate limiting
- **Strengths**: Most accurate, no burst issues, perfect fairness
- **Weakness**: High memory usage
- **Use Cases**: High-precision scenarios, audit-heavy systems

### 5. **Sliding Window Counter**

- **Location**: `algorithms/sliding-window-counter/`
- **Concept**: Uses weighted estimation combining current and previous window counts
- **Strengths**: Good balance of memory efficiency and accuracy
- **Use Cases**: Production systems needing smooth rate limiting

## 📊 Algorithm Comparison

| Algorithm              | Memory Usage | Precision | Burst Handling | Complexity |
| ---------------------- | ------------ | --------- | -------------- | ---------- |
| Token Bucket           | Low          | Good      | Excellent      | Medium     |
| Leaky Bucket           | Medium       | Good      | Good           | High       |
| Fixed Window           | Very Low     | Poor      | Poor           | Low        |
| Sliding Window Log     | High         | Excellent | Excellent      | Medium     |
| Sliding Window Counter | Low          | Good      | Good           | Medium     |

## 🏗️ Project Structure

```
rate-limiter/
├── algorithms/
│   ├── token-bucket/
│   │   ├── index.mjs          # Implementation
│   │   ├── index.test.mjs     # Unit tests
│   │   └── README.md          # Algorithm explanation
│   ├── leaky-bucket/
│   ├── fixed-window-counter/
│   ├── sliding-window-log/
│   └── sliding-window-counter/
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
git clone <repository-url>
cd rate-limiter
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific algorithm tests
npm test algorithms/token-bucket/index.test.mjs
npm test algorithms/sliding-window-log/index.test.mjs
```

## 📚 Learning Approach

Each algorithm implementation includes:

1. **Core Implementation** (`index.mjs`)
   - Clean, readable JavaScript code
   - Focus on algorithm fundamentals
   - Production-ready patterns

2. **Comprehensive Tests** (`index.test.mjs`)
   - Unit tests covering various scenarios
   - Edge case testing
   - Performance validation

3. **Detailed Documentation** (`README.md`)
   - Algorithm explanation and trade-offs
   - Implementation insights
   - Real-world usage examples

## 🛠️ Implementation Features

- **Pure JavaScript**: No external dependencies for core algorithms
- **Memory Efficient**: Optimized data structures and cleanup strategies
- **Multi-User Support**: Per-key rate limiting for different users/resources
- **Time-Based**: Accurate timestamp handling and window calculations
- **Comprehensive Testing**: Vitest-based unit tests with >95% coverage

## 🎓 Key Learning Outcomes

Through this project, you'll understand:

- **Rate Limiting Fundamentals**: Core concepts and terminology
- **Algorithm Trade-offs**: Memory vs precision vs complexity decisions
- **Implementation Details**: Edge cases, time handling, state management
- **Real-World Applications**: When to use each algorithm
- **Testing Strategies**: How to validate rate limiting behavior

## 💡 Usage Examples

### Token Bucket

```javascript
import { TokenBucket } from "./algorithms/token-bucket/index.mjs";

const rateLimiter = new TokenBucket(10, 0.1); // 10 tokens, 0.1 tokens/ms
console.log(rateLimiter.wouldPass("user123")); // true or false
```

### Sliding Window Log

```javascript
import { SlidingWindowLog } from "./algorithms/sliding-window-log/index.mjs";

const rateLimiter = new SlidingWindowLog(100, 60000); // 100 requests per minute
console.log(rateLimiter.check("api-key-456")); // true or false
```

## 🔧 Configuration Options

Each algorithm supports customizable parameters:

- **Capacity**: Maximum requests allowed
- **Time Window**: Duration for rate limiting (milliseconds)
- **Refill/Drain Rate**: Speed of token replenishment or request processing

## 📈 Performance Considerations

- **Token Bucket**: O(1) time complexity, minimal memory per user
- **Leaky Bucket**: O(1) amortized, queue memory scales with capacity
- **Fixed Window**: O(1) time, O(windows) memory per user
- **Sliding Window Log**: O(n) time where n = requests in window
- **Sliding Window Counter**: O(1) time, O(1) memory per user

## 🤝 Contributing

This is a learning repository. Feel free to:

- Experiment with different implementations
- Add new rate limiting algorithms
- Improve test coverage
- Enhance documentation

## 📝 License

This project is for educational purposes. Feel free to use and modify as needed for your learning journey.

## 🔗 References

- [Rate Limiting Algorithms](https://en.wikipedia.org/wiki/Rate_limiting)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Leaky Bucket Algorithm](https://en.wikipedia.org/wiki/Leaky_bucket)
- System Design Interview concepts and patterns

---

_This repository demonstrates hands-on learning of rate limiting algorithms through practical implementation and comprehensive testing._
