from datetime import datetime, timedelta
import json
import redis
from functools import wraps
import asyncio
from enum import Enum
import os
import dotenv
import hashlib

dotenv.load_dotenv()

# Single Redis client instance
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

def get_redis_client():
    """Single point of access for Redis client"""
    return redis.from_url(REDIS_URL, decode_responses=True)

redis_client = get_redis_client()

class CacheType(Enum):
    PROFILE = "profile"
    DYNAMIC = "dynamic"
    STATIC = "static"
    SIMC = "simc"

CACHE_EXPIRY = {
    CacheType.PROFILE: timedelta(hours=3),
    CacheType.DYNAMIC: timedelta(days=1),
    CacheType.STATIC: timedelta(weeks=1),
    CacheType.SIMC: timedelta(hours=1)
}

def determine_cache_type(namespace):
    if namespace == "profile-us":
        return CacheType.PROFILE
    elif namespace == "dynamic-us":
        return CacheType.DYNAMIC
    elif namespace == "static-us":
        return CacheType.STATIC
    return CacheType.PROFILE  # Default to profile if unknown

def create_cache_key(func_name, args, kwargs):
    args_str = ':'.join(str(arg) if not isinstance(arg, dict) else json.dumps(arg, sort_keys=True) for arg in args)
    kwargs_str = ':'.join(f"{k}={v if not isinstance(v, dict) else json.dumps(v, sort_keys=True)}" 
                         for k, v in sorted(kwargs.items()))
    return f"{func_name}:{args_str}:{kwargs_str}"

def create_simc_cache_key(input_text):
    """Create a hash key for SimC input text"""
    return f"simc:{hashlib.md5(input_text.encode()).hexdigest()}"

def cache_api_response(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract namespace from kwargs to determine cache type
        namespace = kwargs.get('namespace', 'profile-us')
        cache_type = determine_cache_type(namespace)
        cache_expiry = CACHE_EXPIRY[cache_type]
        
        cache_key = create_cache_key(func.__name__, args, kwargs)
        
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                cached_dict = json.loads(cached_data)
                cached_time = datetime.fromisoformat(cached_dict['timestamp'])
                
                if datetime.now() - cached_time < cache_expiry:
                    return cached_dict['data']
                
                try:
                    new_data = await func(*args, **kwargs)
                    if new_data is not None:
                        cache_dict = {
                            'data': new_data,
                            'timestamp': datetime.now().isoformat()
                        }
                        redis_client.set(cache_key, json.dumps(cache_dict))
                        return new_data
                    return cached_dict['data']
                except Exception:
                    return cached_dict['data']
            
            data = await func(*args, **kwargs)
            if data is not None:
                cache_dict = {
                    'data': data,
                    'timestamp': datetime.now().isoformat()
                }
                redis_client.set(cache_key, json.dumps(cache_dict))
            return data
            
        except redis.RedisError:
            return await func(*args, **kwargs)
    
    return wrapper

def cache_simc_result(func):
    @wraps(func)
    async def wrapper(self, input: str):
        cache_key = create_simc_cache_key(input)
        
        try:
            # Check cache first
            cached_result = redis_client.get(cache_key)
            if cached_result:
                if os.path.exists(cached_result):
                    return cached_result

            # If not in cache or file doesn't exist, run simulation
            # Properly handle both sync and async calls
            if asyncio.iscoroutinefunction(func):
                output_file = await func(self, input)
            else:
                output_file = func(self, input)
            
            # Cache the successful simulation
            if output_file and os.path.exists(output_file):
                redis_client.setex(
                    cache_key,
                    int(CACHE_EXPIRY[CacheType.SIMC].total_seconds()),
                    output_file
                )
            
            return output_file
            
        except redis.RedisError:
            # If Redis fails, just run the simulation without caching
            if asyncio.iscoroutinefunction(func):
                return await func(self, input)
            else:
                return func(self, input)
    
    return wrapper