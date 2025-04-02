import os
from dotenv import load_dotenv
import aiohttp
from enum import Enum

from .cache import cache_api_response

load_dotenv()

CLIENT_ID = os.getenv("BLIZZARD_CLIENT_ID")
CLIENT_SECRET = os.getenv("BLIZZARD_CLIENT_SECRET")
REDIRECT_URI = 'http://localhost:5173/callback'

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

class RegionLocale:
    def __init__(self, region: Region = Region.US, locale: Locale = Locale.EN_US):
        self.region = region
        self.locale = locale

    @property
    def region_url(self):
        return self.region.value

    @property
    def locale_value(self):
        return self.locale.value

    def get_namespace(self, namespace: Namespace):
        return f"{namespace.value}-{self.region.name.lower()}"

def get_state():
    return os.urandom(4).hex()

async def get_access_token(code):
    token_url = "https://us.battle.net/oauth/token"
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "state": get_state()
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(token_url, data=payload) as response:
            return await response.json()

@cache_api_response
async def get_blizzard_response(
    endpoint, 
    access_token, 
    region_locale: RegionLocale = None,
    namespace: Namespace = None, 
    construct_endpoint=True, 
    **kwargs
):
    if region_locale is None:
        region_locale = RegionLocale()

    if construct_endpoint:
        url = f"{region_locale.region_url}{endpoint}"
        if namespace:
            kwargs["namespace"] = region_locale.get_namespace(namespace)
    else:
        url = endpoint
    
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {**kwargs, "locale": region_locale.locale_value}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params) as response:
            if (status_code := response.status) == 200:
                return await response.json()
            elif status_code - 400 >= 0:
                return None
            return None

async def get_item_media(access_token, media_url, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=media_url,
        region_locale=region_locale,
        construct_endpoint=False
    )

async def get_wow_profile(access_token, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint="/profile/user/wow",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_character_profile(access_token, realm, character, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/profile/wow/character/{realm}/{character}",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_character_equipment(access_token, realm, character, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/profile/wow/character/{realm}/{character}/equipment",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_character_media(access_token, realm, character, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/profile/wow/character/{realm}/{character}/character-media",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_mythic_keystone_profile(access_token, realm, character, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/profile/wow/character/{realm}/{character}/mythic-keystone-profile",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_raid_progression(access_token, realm, character, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/profile/wow/character/{realm}/{character}/encounters/raids",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_guild_info(access_token, realm, guild, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/guild/{realm}/{guild}",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_roster_info(access_token, realm, guild, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/guild/{realm}/{guild}/roster",
        region_locale=region_locale,
        namespace=Namespace.PROFILE
    )

async def get_playable_race_index(access_token, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/playable-race/index",
        region_locale=region_locale,
        namespace=Namespace.STATIC
    )

async def get_playable_class_index(access_token, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/playable-class/index",
        region_locale=region_locale,
        namespace=Namespace.STATIC
    )

async def get_realm_index(access_token, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/realm/index",
        region_locale=region_locale,
        namespace=Namespace.DYNAMIC
    )

async def get_spec_media(access_token, spec_id, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/media/playable-specialization/{spec_id}",
        region_locale=region_locale,
        namespace=Namespace.STATIC
    )

async def get_class_media(access_token, class_id, region_locale: RegionLocale = None):
    return await get_blizzard_response(
        access_token=access_token,
        endpoint=f"/data/wow/media/playable-class/{class_id}",
        region_locale=region_locale,
        namespace=Namespace.STATIC
    )