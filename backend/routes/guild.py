import asyncio

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select, and_
from slugify import slugify

from auth import get_current_user
from .roster import user_is_officer
from database import get_db
from models import User, Guild, Character
from core import bliz
from core.log import log

router = APIRouter(tags=["guild"])

def slugify_realm(realm: str) -> str:
    return slugify(realm, replacements=[["'", ""]])

@router.get("/realms")
async def get_realm_index(
    current_user: User | None = Depends(get_current_user),
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    
    access_token = current_user.api_token
    
    try:
        realm_index = await bliz.get_realm_index(access_token)
        return realm_index
        
    except Exception as e:
        log.error(f"Error fetching realm index: {str(e)}")
        return JSONResponse(
            status_code=500, 
            content={"detail": "Error fetching realm data"}
        )

@router.get("/guild/{realm}/{guild}")
async def get_guild_data(
    realm: str,
    guild: str,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    
    guild = slugify(guild)
    access_token = current_user.api_token

    guild_info, roster_info, race_index, class_index, realm_index = await asyncio.gather(
        bliz.get_guild_info(access_token, realm, guild),
        bliz.get_roster_info(access_token, realm, guild),
        bliz.get_playable_race_index(access_token),
        bliz.get_playable_class_index(access_token),
        bliz.get_realm_index(access_token)
    )

    if not guild_info:
        return JSONResponse(status_code=404, content={"detail": "Guild not found"})

    race_dict = dict([(race["id"], race["name"]) for race in race_index["races"]])
    class_dict = dict([(playable_class["id"], playable_class["name"]) for playable_class in class_index["classes"]])
    realm_dict = dict([(realm["id"], realm["name"]) for realm in realm_index["realms"]])
    # log.info(realm_dict)

    # Slugify guild names
    for r in realm_dict:
        realm_dict[r] = slugify_realm(realm_dict[r])

    class_media_tasks = [bliz.get_class_media(access_token, class_id) for class_id in class_dict.keys()]
    class_media_results = await asyncio.gather(*class_media_tasks)
    class_media_dict = dict(zip(class_dict.keys(), class_media_results))

    guild_id = guild_info.get('id')
    existing_guild = db.exec(
        select(Guild).where(Guild.id == guild_id)
    ).first()

    # Create or update guild in database
    if existing_guild:
        existing_guild.name = guild_info.get('name')
        existing_guild.realm = guild_info.get('realm', {}).get('slug')
        existing_guild.faction = guild_info.get('faction', {}).get('type')
        db.add(existing_guild)
    else:
        new_guild = Guild(
            id=guild_id,
            name=guild_info.get('name'),
            realm = guild_info.get('realm', {}).get('slug'),
            faction=guild_info.get('faction', {}).get('type')
        )
        db.add(new_guild)

    for member in roster_info["members"]:
        character = member["character"]
        char_id = character["id"]
        
        class_id = character["playable_class"]["id"]
        character["playable_class"]["name"] = class_dict[class_id]
        character["playable_class"]["media"] = class_media_dict[class_id]
        race_id = character["playable_race"]["id"]
        character["playable_race"]["name"] = race_dict[race_id]
        realm_id = character["realm"]["id"]
        character["realm"]["name"] = realm_dict[realm_id]
        character["realm"]["short_name"] = realm_dict[realm_id].replace(" ", "")

        existing_character = db.exec(
            select(Character).where(Character.id == char_id)
        ).first()

        # Create or update character in database
        if existing_character:
            existing_character.name = character.get('name')
            existing_character.realm = realm_dict.get(realm_id)
            existing_character.level = character.get('level')
            existing_character.faction = guild_info.get('faction', {}).get('type')
            existing_character.guild_rank = member.get("rank")
            existing_character.playable_class = class_id
            existing_character.playable_race = race_id
            existing_character.guild_id = guild_id
            db.add(existing_character)
        else:
            new_character = Character(
                id=char_id,
                name=character.get('name'),
                realm=realm_dict.get(realm_id),
                level=character.get('level'),
                faction=guild_info.get('faction', {}).get('type'),
                guild_rank=member.get("rank"),
                playable_class=class_id,
                playable_race=race_id,
                guild_id=guild_id
            )
            db.add(new_character)

    guild_master_id = next((member["character"]["id"] for member in roster_info["members"] 
                        if member.get("rank") == 0), None)
    if guild_master_id:
        if existing_guild:
            existing_guild.guild_master_id = guild_master_id
        else:
            new_guild.guild_master_id = guild_master_id

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"Error updating guild and roster: {str(e)}")
        return JSONResponse(status_code=500, content={"detail": "Error updating database"})

    # Checks if user can manage rosters
    guild_db = db.exec(
        select(Guild).where(Guild.id == guild_id)
    ).first()
    
    can_manage_rosters = user_is_officer(current_user, guild_db, db) if guild_db else False

    return {
        "guild": guild_info,
        "roster": roster_info,
        "can_manage_rosters": can_manage_rosters
    }

@router.put("/guilds/{guild_id}/roster-creation-rank")
async def update_roster_creation_rank(
    guild_id: int,
    rank: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    
    guild = db.get(Guild, guild_id)
    if not guild:
        return JSONResponse(status_code=404, content={"detail": "Guild not found"})
    
    is_guild_master = db.exec(
        select(Character).where(
            and_(
                Character.user_id == current_user.id,
                Character.id == guild.guild_master_id
            )
        )
    ).first() is not None
    
    if not is_guild_master:
        return JSONResponse(
            status_code=403,
            content={
                "detail": "Only the guild master can change the roster creation rank",
                "error_code": "NOT_GUILD_MASTER"
            }
        )
    
    guild.roster_creation_rank = rank
    db.add(guild)
    try:
        db.commit()
        return {"message": "Roster creation rank updated successfully"}
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"detail": str(e)})