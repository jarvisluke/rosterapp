import axios from 'axios';
import { CacheManager } from './cache';

class ApiClient {
  constructor(baseURL = '', defaultTimeout = 30000) {
    this.baseURL = baseURL;
    this.defaultTimeout = defaultTimeout;
    this.cache = new CacheManager();
    this.activeRequests = new Map(); // For request deduplication
    
    // Create axios instance with interceptors
    this.client = axios.create({
      baseURL,
      timeout: defaultTimeout,
    });
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      this.client.interceptors.request.use(
        (config) => {
          console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => Promise.reject(error)
      );
      
      this.client.interceptors.response.use(
        (response) => {
          console.log(`API Response: ${response.status} ${response.config.url}`);
          return response;
        },
        (error) => {
          console.error(`API Error: ${error.config?.url}`, error.response?.status, error.message);
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Generate cache key for request
   */
  getCacheKey(method, url, params = {}, data = {}) {
    const key = `${method}:${url}`;
    const queryString = Object.keys(params).length 
      ? `?${new URLSearchParams(params).toString()}` 
      : '';
    const dataString = Object.keys(data).length 
      ? `#${JSON.stringify(data)}` 
      : '';
    return `${key}${queryString}${dataString}`;
  }

  /**
   * Generate request deduplication key
   */
  getRequestKey(method, url, config = {}) {
    return `${method}:${url}:${JSON.stringify(config)}`;
  }

  /**
   * Make HTTP request with caching and deduplication
   */
  async request(method, endpoint, options = {}) {
    const {
      cache = false,
      cacheTTL = 1000 * 60 * 5, // 5 minutes default
      timeout = this.defaultTimeout,
      retries = 1,
      retryDelay = 1000,
      params = {},
      data = {},
      ...axiosConfig
    } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(method, url, params, data);
    const requestKey = this.getRequestKey(method, url, { params, data, ...axiosConfig });

    // Check cache for GET requests
    if (cache && method.toLowerCase() === 'get') {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        console.log(`Cache hit: ${cacheKey}`);
        return cachedData;
      }
    }

    // Deduplicate identical requests
    if (this.activeRequests.has(requestKey)) {
      console.log(`Request deduplication: ${requestKey}`);
      return this.activeRequests.get(requestKey);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const config = {
      method,
      url,
      params,
      data,
      signal: controller.signal,
      ...axiosConfig
    };

    // Create request promise with retry logic
    const requestPromise = this.executeWithRetry(() => this.client.request(config), retries, retryDelay)
      .then(response => {
        clearTimeout(timeoutId);
        
        // Cache successful GET responses
        if (cache && method.toLowerCase() === 'get' && response.data) {
          this.cache.set(cacheKey, response.data, cacheTTL);
        }
        
        return response.data;
      })
      .catch(error => {
        clearTimeout(timeoutId);
        
        // Transform error for better handling
        const apiError = new ApiError(
          error.message,
          error.response?.status,
          error.response?.data,
          error.code
        );
        
        throw apiError;
      })
      .finally(() => {
        this.activeRequests.delete(requestKey);
      });

    // Store active request for deduplication
    this.activeRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  }

  /**
   * Execute request with retry logic
   */
  async executeWithRetry(requestFn, retries, retryDelay) {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) or abort
        if (
          attempt === retries ||
          error.code === 'ERR_CANCELED' ||
          (error.response && error.response.status >= 400 && error.response.status < 500)
        ) {
          throw error;
        }
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  get(endpoint, options = {}) {
    return this.request('get', endpoint, options);
  }

  post(endpoint, data = {}, options = {}) {
    return this.request('post', endpoint, { ...options, data });
  }

  put(endpoint, data = {}, options = {}) {
    return this.request('put', endpoint, { ...options, data });
  }

  delete(endpoint, options = {}) {
    return this.request('delete', endpoint, options);
  }

  patch(endpoint, data = {}, options = {}) {
    return this.request('patch', endpoint, { ...options, data });
  }

  // Cache management
  clearCache(pattern) {
    this.cache.clear(pattern);
  }

  invalidateCache(method, endpoint, params = {}, data = {}) {
    const cacheKey = this.getCacheKey(method, endpoint, params, data);
    this.cache.delete(cacheKey);
  }
}

// Custom error class
export class ApiError extends Error {
  constructor(message, status, data, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = code;
  }

  get isNetworkError() {
    return this.code === 'ERR_NETWORK';
  }

  get isTimeoutError() {
    return this.code === 'ECONNABORTED' || this.code === 'ERR_CANCELED';
  }

  get isServerError() {
    return this.status >= 500;
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

// Create default instance
const apiClient = new ApiClient();

// Legacy compatibility function
export default function fetchApi(endpoint, stored = false, timeout = 5000) {
  return apiClient.get(endpoint, { 
    cache: stored, 
    timeout,
    cacheTTL: stored ? 1000 * 60 * 30 : 0 // 30 minutes for stored requests
  });
}

export { apiClient };