import axios from 'axios';
import { getItem, setItem } from './storage';

export default async function fetchApi(endpoint, stored = false, timeout = 5000) {
  // Check localStorage first if stored is true
  if (stored) {
    const cachedData = getItem(endpoint);
    if (cachedData !== null) {
      return cachedData;
    }
  }

  try {
    // Make the API call
    const response = await axios.get(endpoint, {
      signal: AbortSignal.timeout(timeout)
    });

    // Store the result if stored is true
    if (stored && response.data) {
      setItem(endpoint, response.data);
    }

    return response.data;
    
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw error;
  }
}