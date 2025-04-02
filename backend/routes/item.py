import asyncio
from typing import List

from fastapi import APIRouter, Depends, Body
from fastapi.responses import JSONResponse

from auth import get_current_user
from models import User
from core import bliz

router = APIRouter(tags=["item"])

@router.post("/item/media")
async def get_item_media(
    media_urls: List[str] = Body(...),
    current_user: User | None = Depends(get_current_user),
):
    if not current_user:
        return JSONResponse(status_code=401, content={"detail": "Not authenticated"})

    access_token = current_user.api_token
    
    coroutines = [bliz.get_item_media(access_token, url) for url in media_urls]
    results = await asyncio.gather(*coroutines)
    
    media_data = {url: result for url, result in zip(media_urls, results) if result}
    
    if not media_data:
        return JSONResponse(status_code=404, content={"detail": "No media found"})
    return media_data