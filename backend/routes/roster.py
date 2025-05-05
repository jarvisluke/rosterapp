import asyncio
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select, and_

from core.log import log
from core.bliz import get_blizzard_client, BlizzardAPIClient
from auth import get_current_user
from database import get_db
from models import (
    User, Guild, Roster, Character, RosterCharacter,
    CharacterRole, RosterStatus
)

router = APIRouter(tags=["roster"])

class CharacterRosterInfo(BaseModel):
    character_id: int
    role: CharacterRole
    status: RosterStatus

class RosterUpdateRequest(BaseModel):
    name: Optional[str]
    size: Optional[int]
    characters: Optional[List[CharacterRosterInfo]]

def user_is_officer(user: User, guild: Guild, db: Session) -> bool:
    if not user or not guild:
        return False
    
    guild_characters = db.exec(
        select(Character).where(
            and_(
                Character.user_id == user.id,
                Character.guild_id == guild.id
            )
        )
    ).all()
    
    return any(char.guild_rank is not None and char.guild_rank <= guild.roster_creation_rank 
               for char in guild_characters)

def get_roster_with_checks(
    realm: str,
    guild: str,
    roster_id: int,
    current_user: User,
    db: Session
) -> Optional[Roster]:
    roster = db.exec(
        select(Roster)
        .where(Roster.id == roster_id)
        .join(Guild)
        .where(Guild.name == guild, Guild.realm == realm)
    ).first()

    if not roster:
        return None

    if not user_is_officer(current_user, roster.guild, db):
        return None

    return roster

async def prepare_roster_character(
    character: Character, 
    class_dict: dict, 
    class_media_dict: dict, 
    race_dict: dict,
    realm_dict: dict, 
    role: CharacterRole | None = None, 
    status: RosterStatus | None = None
) -> dict:
    return {
        "id": character.id,
        "name": character.name,
        "realm": {
            "slug": character.realm,
            "name": character.realm,
            "short_name": character.realm.replace(" ", "")
        },
        "playable_class": {
            "id": character.playable_class,
            "name": class_dict[character.playable_class],
            "media": class_media_dict[character.playable_class]
        },
        "playable_race": {
            "id": character.playable_race,
            "name": race_dict[character.playable_race]
        },
        "level": character.level,
        "role": role,
        "status": status,
        "guild_rank": character.guild_rank
    }

async def prepare_roster_response(
    roster: Roster, 
    class_dict: dict, 
    class_media_dict: dict, 
    race_dict: dict,
    realm_dict: dict
) -> dict:
    return {
        "id": roster.id,
        "name": roster.name,
        "size": roster.size,
        "guild": {
            "id": roster.guild.id,
            "name": roster.guild.name,
            "realm": roster.guild.realm
        },
        "characters": [
            {
                **(await prepare_roster_character(
                    rc.character, 
                    class_dict, 
                    class_media_dict, 
                    race_dict,
                    realm_dict, 
                    rc.role, 
                    rc.status
                )),
                "is_guild_member": rc.is_guild_member()
            } for rc in roster.roster_characters
        ]
    }

@router.get("/guild/{realm}/{guild}/roster")
async def get_guild_roster(
    realm: str,
    guild: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    bliz: BlizzardAPIClient = Depends(get_blizzard_client)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    
    guild_db = db.exec(
        select(Guild)
        .where(Guild.name == guild, Guild.realm == realm)
    ).first()

    if not guild_db:
        return JSONResponse(
            status_code=404,
            content={"detail": "Guild not found"}
        )

    if not user_is_officer(current_user, guild_db, db):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "You don't have permission to view roster in this guild",
                "error_code": "INSUFFICIENT_GUILD_RANK"
            }
        )

    access_token = current_user.api_token
    
    # Fetch necessary data from Blizzard API
    race_index, class_index = await asyncio.gather(
        bliz.get_playable_race_index(access_token),
        bliz.get_playable_class_index(access_token)
    )

    race_dict = dict([(race["id"], race["name"]) for race in race_index["races"]])
    class_dict = dict([(playable_class["id"], playable_class["name"]) 
                       for playable_class in class_index["classes"]])

    # Fetch class media
    class_media_tasks = [bliz.get_class_media(access_token, class_id) 
                         for class_id in class_dict.keys()]
    class_media_results = await asyncio.gather(*class_media_tasks)
    class_media_dict = dict(zip(class_dict.keys(), class_media_results))

    characters = db.exec(
        select(Character)
        .where(Character.guild_id == guild_db.id)
        .order_by(Character.name)
    ).all()

    prepared_characters = []
    for character in characters:
        prepared_characters.append({
            "id": character.id,
            "name": character.name,
            "realm": {
                "slug": character.realm,
                "name": character.realm,
                "short_name": character.realm.replace(" ", "")
            },
            "playable_class": {
                "id": character.playable_class,
                "name": class_dict[character.playable_class],
                "media": class_media_dict[character.playable_class]
            },
            "playable_race": {
                "id": character.playable_race,
                "name": race_dict[character.playable_race]
            },
            "level": character.level,
            "guild_rank": character.guild_rank
        })

    return {
        "guild": {
            "id": guild_db.id,
            "name": guild_db.name,
            "realm": guild_db.realm
        },
        "characters": prepared_characters
    }

@router.get("/guild/{realm}/{guild}/rosters")
async def get_guild_rosters(
    realm: str,
    guild: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    bliz: BlizzardAPIClient = Depends(get_blizzard_client)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    guild_db = db.exec(
        select(Guild)
        .where(Guild.name == guild, Guild.realm == realm)
    ).first()

    if not guild_db:
        return JSONResponse(
            status_code=404,
            content={"detail": "Guild not found"}
        )

    if not user_is_officer(current_user, guild_db, db):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "You don't have permission to view rosters in this guild",
                "error_code": "INSUFFICIENT_GUILD_RANK"
            }
        )

    access_token = current_user.api_token

    # Fetch necessary data from Blizzard API
    class_index, realm_index = await asyncio.gather(
        bliz.get_playable_class_index(access_token),
        bliz.get_realm_index(access_token)
    )

    class_dict = dict([(playable_class["id"], playable_class["name"]) 
                       for playable_class in class_index["classes"]])
    race_index = await bliz.get_playable_race_index(access_token)
    race_dict = dict([(race["id"], race["name"]) for race in race_index["races"]])
    
    realm_dict = dict([(realm["id"], realm["name"]) 
                       for realm in realm_index["realms"]])

    # Fetch class media
    class_media_tasks = [bliz.get_class_media(access_token, class_id) 
                         for class_id in class_dict.keys()]
    class_media_results = await asyncio.gather(*class_media_tasks)
    class_media_dict = dict(zip(class_dict.keys(), class_media_results))

    rosters = db.exec(
        select(Roster)
        .where(Roster.guild_id == guild_db.id)
        .order_by(Roster.updated_at.desc())
    ).all()

    return [await prepare_roster_response(roster, class_dict, class_media_dict, race_dict, realm_dict) 
            for roster in rosters]

@router.get("/guild/{realm}/{guild}/{roster_id}")
async def get_roster(
    realm: str,
    guild: str,
    roster_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    bliz: BlizzardAPIClient = Depends(get_blizzard_client)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    access_token = current_user.api_token

    roster = get_roster_with_checks(realm, guild, roster_id, current_user, db)
    if not roster:
        return JSONResponse(
            status_code=404,
            content={"detail": "Roster not found or insufficient permissions"}
        )

    access_token = current_user.api_token

    # Fetch necessary data from Blizzard API
    class_index, realm_index = await asyncio.gather(
        bliz.get_playable_class_index(access_token),
        bliz.get_realm_index(access_token)
    )
    race_index = await bliz.get_playable_race_index(access_token)
    race_dict = dict([(race["id"], race["name"]) for race in race_index["races"]])
    class_dict = dict([(playable_class["id"], playable_class["name"]) 
                       for playable_class in class_index["classes"]])
    realm_dict = dict([(realm["id"], realm["name"]) 
                       for realm in realm_index["realms"]])

    # Fetch class media
    class_media_tasks = [bliz.get_class_media(access_token, class_id) 
                         for class_id in class_dict.keys()]
    class_media_results = await asyncio.gather(*class_media_tasks)
    class_media_dict = dict(zip(class_dict.keys(), class_media_results))
    
    return await prepare_roster_response(roster, class_dict, class_media_dict, race_dict, realm_dict)