/**
 * Get an item from localStorage
 * @param {string} key - The key to retrieve
 * @returns {any|null} The parsed value or null if not found
 */
export function getItem(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting item from localStorage (${key}):`, error);
    return null;
  }
}

/**
 * Set an item in localStorage
 * @param {string} key - The key to store
 * @param {any} value - The value to store (will be stringified)
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item in localStorage (${key}):`, error);
  }
}

/**
 * Remove an item from localStorage
 * @param {string} key - The key to remove
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing item from localStorage (${key}):`, error);
  }
}

/**
 * Clear all items from localStorage
 */
export function clearAll() {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

/**
 * Check if an item exists in localStorage
 * @param {string} key - The key to check
 * @returns {boolean} Whether the key exists
 */
export function hasItem(key) {
  return localStorage.getItem(key) !== null;
}

/**
 * Get all keys in localStorage
 * @returns {string[]} Array of all keys
 */
export function getAllKeys() {
  return Object.keys(localStorage);
}