/**
 * ConfidenceEngine — Skip LLM for known patterns
 *
 * When we've successfully executed a similar task before,
 * replay the action without an LLM round-trip.
 * Saves tokens and latency.
 */

export class ConfidenceEngine {
  constructor(threshold = 0.85) {
    this.threshold = threshold;
    this.cache = new Map();
    this.patterns = new Map();
  }

  /**
   * Look up a cached action for a given task.
   * Returns the cached result if confidence is high enough, null otherwise.
   */
  lookup(task, bot) {
    const normalized = this.normalize(task);

    // Exact match
    if (this.cache.has(normalized)) {
      const entry = this.cache.get(normalized);
      if (entry.count >= 2) { // Seen at least twice
        return entry.result;
      }
    }

    // Fuzzy match — check pattern similarity
    for (const [pattern, entry] of this.patterns) {
      if (this.similarity(normalized, pattern) >= this.threshold && entry.count >= 3) {
        return this.replayPattern(entry, bot);
      }
    }

    return null;
  }

  /**
   * Cache a successful task→result mapping.
   */
  cache(task, result) {
    const normalized = this.normalize(task);

    if (this.cache.has(normalized)) {
      this.cache.get(normalized).count++;
    } else {
      this.cache.set(normalized, { task, result, count: 1, timestamp: Date.now() });
    }

    // Also store as pattern for fuzzy matching
    const patternKey = this.extractPattern(normalized);
    if (this.patterns.has(patternKey)) {
      const p = this.patterns.get(patternKey);
      p.count++;
      p.examples.push({ task: normalized, result });
    } else {
      this.patterns.set(patternKey, {
        pattern: patternKey,
        count: 1,
        examples: [{ task: normalized, result }],
      });
    }
  }

  /**
   * Extract the action pattern from a task string.
   * "mine 10 diamond_ore" → "mine <count> <block>"
   * "go to 100 64 200" → "go <coords>"
   */
  extractPattern(task) {
    const parts = task.toLowerCase().split(/\s+/);
    const verb = parts[0];

    const patterns = {
      'mine': () => `mine ${parts.length > 1 ? '<target>' : ''}`,
      'go': () => `go <coords>`,
      'goto': () => `go <coords>`,
      'move': () => `go <coords>`,
      'build': () => `build <desc>`,
      'craft': () => `craft <item>`,
      'equip': () => `equip <item>`,
      'attack': () => `attack <target>`,
      'give': () => `give <player> <item>`,
      'place': () => `place <block>`,
      'dig': () => `dig <target>`,
      'say': () => `say <msg>`,
      'chat': () => `say <msg>`,
    };

    return patterns[verb]?.() || task;
  }

  replayPattern(entry, bot) {
    if (entry.examples.length === 0) return null;
    // Return the most recent successful result
    const latest = entry.examples[entry.examples.length - 1];
    return latest.result;
  }

  normalize(task) {
    return task.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  similarity(a, b) {
    if (a === b) return 1;
    const aWords = new Set(a.split(/\s+/));
    const bWords = new Set(b.split(/\s+/));
    const intersection = [...aWords].filter(w => bWords.has(w)).length;
    const union = new Set([...aWords, ...bWords]).size;
    return union === 0 ? 0 : intersection / union;
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      patternSize: this.patterns.size,
    };
  }
}
