export class CacheManager {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = new Map(); // For LRU eviction
  }

  set(key, value, ttl = 1000 * 60 * 5) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    this.accessOrder.set(key, Date.now());
    
    try {
      // Also store in localStorage for persistence
      const persistentData = { value, expiresAt };
      localStorage.setItem(`api_cache_${key}`, JSON.stringify(persistentData));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }

  get(key) {
    // Check memory cache first
    let item = this.cache.get(key);
    
    // If not in memory, try localStorage
    if (!item) {
      try {
        const stored = localStorage.getItem(`api_cache_${key}`);
        if (stored) {
          item = JSON.parse(stored);
          // Restore to memory cache
          this.cache.set(key, item);
        }
      } catch (error) {
        console.warn('Failed to read cache from localStorage:', error);
        return null;
      }
    }

    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.accessOrder.set(key, Date.now());
    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
    this.accessOrder.delete(key);
    try {
      localStorage.removeItem(`api_cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove cache from localStorage:', error);
    }
  }

  clear(pattern) {
    if (pattern) {
      const regex = new RegExp(pattern);
      const keysToDelete = [];
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.delete(key));
      
      // Clear from localStorage too
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('api_cache_') && regex.test(key.slice(10))) {
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
    } else {
      this.cache.clear();
      this.accessOrder.clear();
      
      // Clear all cache from localStorage
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('api_cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
    }
  }

  evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, accessTime] of this.accessOrder) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}