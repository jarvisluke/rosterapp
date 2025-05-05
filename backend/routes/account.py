import aiohttp
from fastapi import APIRouter, Request, Response, Depends
from fastapi.responses import JSONResponse

from auth import create_access_token
from database import get_or_create_user
from core.bliz import get_blizzard_client, BlizzardAPIClient
from core.log import log

router = APIRouter(tags=["auth"])

@router.get("/login-url")
async def get_login_url(
    response: Response,
    bliz: BlizzardAPIClient = Depends(get_blizzard_client)
):
    state = bliz.get_state()
    AUTH_URL = (
        f"https://us.battle.net/oauth/authorize?"
        f"response_type=code"
        f"&state={state}"
        f"&client_id={bliz.CLIENT_ID}"
        f"&redirect_uri={bliz.REDIRECT_URI}"
        f"&scope=openid%20profile%20email%20battlenet-profile-read%20battlenet-account-read%20wow.profile"
    )
    
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False, # SET TO True FOR PRODUCTION
        samesite="lax",
        max_age=300
    )
    
    return {"auth_url": AUTH_URL}

@router.get("/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("session")
    return response

@router.get("/callback")
async def oauth_callback(
    request: Request, 
    code: str, 
    state: str, 
    response: Response,
    bliz: BlizzardAPIClient = Depends(get_blizzard_client)
):
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != state:
        return JSONResponse(
            status_code=400,
            content={"detail": "Invalid state parameter"}
        )
    
    response.delete_cookie("oauth_state")
    
    try:
        token_data = await bliz.get_access_token(code)
        
        async with aiohttp.ClientSession() as session:
            user_info_url = "https://us.battle.net/oauth/userinfo"
            headers = {"Authorization": f"Bearer {token_data['access_token']}"}
            async with session.get(user_info_url, headers=headers) as bnet_response:
                user_info = await bnet_response.json()
        
        user = get_or_create_user(user_info, token_data['access_token'], token_data['expires_in'])
        
        access_token = create_access_token(data={"sub": str(user.id)})
        
        response.set_cookie(
            key="session",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60 * 60 * 24
        )
        
        return {"success": True, "user": {
            "battle_tag": user.battle_tag,
            "email": user.email
        }}
    
    except Exception as e:
        log.error(f"Error during OAuth callback: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Error processing OAuth callback"}
        )