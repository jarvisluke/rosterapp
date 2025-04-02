from sqlmodel import Session, select, create_engine
from models import User
from datetime import datetime, timedelta
from fastapi import HTTPException, status

# Database configuration
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)

def get_db():
    with Session(engine) as session:
        yield session

def get_or_create_user(user_info, api_token, expires_in):
    with Session(engine) as session:
        statement = select(User).where(User.battle_net_id == user_info['id'])
        user = session.exec(statement).first()
        
        token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        
        if not user:
            user = User(
                battle_net_id=user_info['id'],
                battle_tag=user_info['battletag'],
                email=user_info.get('email'),
                api_token=api_token,
                token_expires_at=token_expires_at
            )
            session.add(user)
        else:
            user.api_token = api_token
            user.battle_tag = user_info['battletag']
            user.email = user_info.get('email')
            user.token_expires_at = token_expires_at
        
        try:
            session.commit()
            session.refresh(user)
            return user
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create or update user"
            )