import asyncio
import logging as log

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from auth import get_current_user
from database import get_db
from models import User, Character
from core import bliz

router = APIRouter(tags=["character"])

@router.get("/character/{realm}/{character}")
async def get_character_data(
    realm: str,
    character: str,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    access_token = current_user.api_token
    
    profile, equipment, character_media, mythic_keystone_profile, raid_progression = await asyncio.gather(
        *[func(access_token, realm, character) for func in [
            bliz.get_character_profile, 
            bliz.get_character_equipment, 
            bliz.get_character_media, 
            bliz.get_mythic_keystone_profile, 
            bliz.get_raid_progression
        ]]
    )
    
    if not profile:
        return JSONResponse(status_code=404, content={"detail": "Character not found"})

    char_id = profile.get('id')
    existing_character = db.exec(
        select(Character).where(Character.id == char_id)
    ).first()
    
    if existing_character:
        existing_character.name = profile.get('name')
        existing_character.realm = profile.get('realm', {}).get('slug')
        existing_character.level = profile.get('level')
        existing_character.faction = profile.get('faction', {}).get('type')
        existing_character.gender = profile.get('gender', {}).get('type')
        existing_character.playable_class = profile.get('character_class', {}).get('id')
        existing_character.playable_race = profile.get('race', {}).get('id')
        existing_character.user_id = current_user.id
        db.add(existing_character)
    else:
        new_character = Character(
            id=char_id,
            name=profile.get('name'),
            realm=profile.get('realm', {}).get('slug'),
            user_id=current_user.id,
            level=profile.get('level'),
            faction=profile.get('faction', {}).get('type'),
            gender=profile.get('gender', {}).get('type'),
            playable_class=profile.get('character_class', {}).get('id'),
            playable_race=profile.get('race', {}).get('id')
        )
        db.add(new_character)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"Error updating character: {str(e)}")

    current_raid = raid_progression["expansions"][-1]["instances"][-1]
    
    return {
        "battle_tag": current_user.battle_tag,
        "character": profile,
        "equipment": equipment,
        "character_media": character_media,
        "mythic_keystone_profile": mythic_keystone_profile,
        "current_raid": current_raid
    }

@router.get("/character/{realm}/{character}/equipment")
async def get_character_equipment(
    realm: str,
    character: str,
    current_user: User | None = Depends(get_current_user)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    equipment = await bliz.get_character_equipment(current_user.api_token, realm, character)
    
    if not equipment:
        return JSONResponse(status_code=404, content={"detail": "Character not found"})
    
    return equipment