from logging import log

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from auth import get_current_user
from database import get_db
from models import User, Character
from core import bliz

router = APIRouter(tags=["user"])

@router.get("/account")
async def get_account_info(current_user: User | None = Depends(get_current_user)):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    return {
        "battle_tag": current_user.battle_tag,
        "email": current_user.email,
        "user_id": current_user.id
    }

@router.get("/wow-profile")
async def get_wow_profile_data(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
    
    access_token = current_user.api_token
    wow_profile = await bliz.get_wow_profile(access_token)
    
    characters = []
    for account in wow_profile.get('wow_accounts', []):
        for char_data in account.get('characters', []):
            char_id = char_data.get('id')
            name = char_data.get('name')
            realm_name = char_data.get('realm', {}).get('slug')
            level = char_data.get('level')
            faction = char_data.get('faction', {}).get('type')
            gender = char_data.get('gender', {}).get('type')
            playable_class = char_data.get('playable_class', {}).get('id')
            playable_race = char_data.get('playable_race', {}).get('id')
            
            existing_character = db.exec(
                select(Character).where(Character.id == char_id)
            ).first()
            
            if existing_character:
                existing_character.user_id = current_user.id
                existing_character.name = name
                existing_character.realm = realm_name
                existing_character.level = level
                existing_character.faction = faction
                existing_character.gender = gender
                existing_character.playable_class = playable_class
                existing_character.playable_race = playable_race
                db.add(existing_character)
                characters.append(existing_character)
            else:
                new_character = Character(
                    id=char_id,
                    name=name,
                    realm=realm_name,
                    user_id=current_user.id,
                    level=level,
                    faction=faction,
                    gender=gender,
                    playable_class=playable_class,
                    playable_race=playable_race
                )
                db.add(new_character)
                characters.append(new_character)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        log.error(f"Error updating characters: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Error updating character data"}
        )
    
    return {
        "battle_tag": current_user.battle_tag,
        "wow_profile": wow_profile
    }