import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import aiohttp
from dotenv import load_dotenv
from aiolimiter import AsyncLimiter
from contextlib import asynccontextmanager
import asyncio
from functools import wraps

from .cache import cache_api_response

load_dotenv()


class Locale(Enum):
    EN_US = "en_US"
    ES_MX = "es_MX"
    PT_BR = "pt_BR"
    EN_GB = "en_GB"
    ES_ES = "es_ES"
    FR_FR = "fr_FR"
    RU_RU = "ru_RU"
    DE_DE = "de_DE"
    PT_PT = "pt_PT"
    IT_IT = "it_IT"
    KO_KR = "ko_KR"
    ZH_TW = "zh_TW"
    ZH_CN = "zh_CN"


class Region(Enum):
    US = "https://us.api.blizzard.com"
    EU = "https://eu.api.blizzard.com"
    KR = "https://kr.api.blizzard.com"
    TW = "https://tw.api.blizzard.com"
    CN = "https://gateway.battlenet.com.cn"


class Namespace(Enum):
    DYNAMIC = "dynamic"
    STATIC = "static"
    PROFILE = "profile"


@dataclass
class RegionLocale:
    region: Region = Region.US
    locale: Locale = Locale.EN_US

    @property
    def region_url(self):
        return self.region.value

    @property
    def locale_value(self):
        return self.locale.value

    def get_namespace(self, namespace: Namespace):
        return f"{namespace.value}-{self.region.name.lower()}"


class BlizzardAPIClient:
    """Battle.net API client with rate limiting and session management."""
    
    def __init__(self):
        self.CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
        self.CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")
        self.REDIRECT_URI = 'http://localhost:5173/callback'
        
        # Rate limiter with 100 requests per second and 36000 per hour
        self.rate_limiter = AsyncLimiter(100, 1)
        self.hourly_limiter = AsyncLimiter(36000, 3600)
        
        # Session cache
        self._session: Optional[aiohttp.ClientSession] = None
    
    @asynccontextmanager
    async def session(self):
        """Context manager for aiohttp client session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        try:
            yield self._session
        finally:
            # Keep session open for reuse
            pass
    
    async def close(self):
        """Close the client session."""
        if self._session and not self._session.closed:
            await self._session.close()
    
    @staticmethod
    def get_state() -> str:
        """Generate a random state for OAuth."""
        return os.urandom(4).hex()
    
    async def get_access_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        async with self.rate_limiter:
            async with self.hourly_limiter:
                token_url = "https://us.battle.net/oauth/token"
                payload = {
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.REDIRECT_URI,
                    "client_id": self.CLIENT_ID,
                    "client_secret": self.CLIENT_SECRET,
                    "state": self.get_state()
                }
                
                async with self.session() as session:
                    async with session.post(token_url, data=payload) as response:
                        return await response.json()
    
    @cache_api_response
    async def make_request(
        self,
        endpoint: str,
        access_token: str,
        region_locale: Optional[RegionLocale] = None,
        namespace: Optional[Namespace] = None,
        construct_endpoint: bool = True,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """Make a generic request to the Battle.net API with rate limiting."""
        async with self.rate_limiter:
            async with self.hourly_limiter:
                if region_locale is None:
                    region_locale = RegionLocale()
                
                url = self._construct_url(endpoint, region_locale, construct_endpoint)
                headers = {"Authorization": f"Bearer {access_token}"}
                params = self._construct_params(region_locale, namespace, kwargs)
                
                return await self._execute_request(url, headers, params)
    
    def _construct_url(self, endpoint: str, region_locale: RegionLocale, construct: bool) -> str:
        """Construct the API URL."""
        if construct:
            return f"{region_locale.region_url}{endpoint}"
        return endpoint
    
    def _construct_params(
        self, 
        region_locale: RegionLocale, 
        namespace: Optional[Namespace], 
        kwargs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Construct request parameters."""
        params = {"locale": region_locale.locale_value}
        if namespace:
            params["namespace"] = region_locale.get_namespace(namespace)
        return {**kwargs, **params}
    
    async def _execute_request(
        self,
        url: str,
        headers: Dict[str, str],
        params: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Execute the HTTP request."""
        try:
            async with self.session() as session:
                async with session.get(url, headers=headers, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 429:
                        # Handle rate limiting at API level
                        retry_after = int(response.headers.get('Retry-After', 60))
                        await asyncio.sleep(retry_after)
                        return await self._execute_request(url, headers, params)
                    elif response.status >= 400:
                        return None
                    return None
        except Exception:
            return None
    
    # Profile methods
    async def get_wow_profile(self, access_token: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint="/profile/user/wow",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    async def get_character_profile(self, access_token: str, realm: str, character: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/profile/wow/character/{realm}/{character}",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    async def get_character_equipment(self, access_token: str, realm: str, character: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/profile/wow/character/{realm}/{character}/equipment",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    async def get_character_media(self, access_token: str, realm: str, character: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/profile/wow/character/{realm}/{character}/character-media",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    async def get_mythic_keystone_profile(self, access_token: str, realm: str, character: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/profile/wow/character/{realm}/{character}/mythic-keystone-profile",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    async def get_raid_progression(self, access_token: str, realm: str, character: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/profile/wow/character/{realm}/{character}/encounters/raids",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    # Guild methods
    async def get_guild_info(self, access_token: str, realm: str, guild: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/data/wow/guild/{realm}/{guild}",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    async def get_roster_info(self, access_token: str, realm: str, guild: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/data/wow/guild/{realm}/{guild}/roster",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.PROFILE
        )
    
    # Game data methods
    async def get_playable_race_index(self, access_token: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint="/data/wow/playable-race/index",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.STATIC
        )
    
    async def get_playable_class_index(self, access_token: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint="/data/wow/playable-class/index",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.STATIC
        )
    
    async def get_realm_index(self, access_token: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint="/data/wow/realm/index",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.DYNAMIC
        )
    
    # Media methods
    async def get_spec_media(self, access_token: str, spec_id: int, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/data/wow/media/playable-specialization/{spec_id}",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.STATIC
        )
    
    async def get_class_media(self, access_token: str, class_id: int, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=f"/data/wow/media/playable-class/{class_id}",
            access_token=access_token,
            region_locale=region_locale,
            namespace=Namespace.STATIC
        )
    
    async def get_item_media(self, access_token: str, media_url: str, region_locale: Optional[RegionLocale] = None):
        return await self.make_request(
            endpoint=media_url,
            access_token=access_token,
            region_locale=region_locale,
            construct_endpoint=False
        )
    
from fastapi import Request

async def get_blizzard_client(request: Request) -> BlizzardAPIClient:
    """
    Dependency injection function for BlizzardAPIClient.
    
    This simply retrieves the BlizzardAPIClient instance from the app state
    that was created during startup. This ensures all endpoints use the same
    client instance with shared rate limiting and session.
    """
    return request.app.state.blizzard_client

# Create a global instance
bliz_client = BlizzardAPIClient()

# Backward compatibility functions
def get_state():
    return bliz_client.get_state()

async def get_access_token(code):
    return await bliz_client.get_access_token(code)

# Re-export all the methods for backward compatibility
get_wow_profile = bliz_client.get_wow_profile
get_character_profile = bliz_client.get_character_profile
get_character_equipment = bliz_client.get_character_equipment
get_character_media = bliz_client.get_character_media
get_mythic_keystone_profile = bliz_client.get_mythic_keystone_profile
get_raid_progression = bliz_client.get_raid_progression
get_guild_info = bliz_client.get_guild_info
get_roster_info = bliz_client.get_roster_info
get_playable_race_index = bliz_client.get_playable_race_index
get_playable_class_index = bliz_client.get_playable_class_index
get_realm_index = bliz_client.get_realm_index
get_spec_media = bliz_client.get_spec_media
get_class_media = bliz_client.get_class_media
get_item_media = bliz_client.get_item_media

# Export necessary items
CLIENT_ID = bliz_client.CLIENT_ID
CLIENT_SECRET = bliz_client.CLIENT_SECRET
REDIRECT_URI = bliz_client.REDIRECT_URI