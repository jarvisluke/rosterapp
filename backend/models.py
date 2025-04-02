from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, create_engine
from datetime import datetime
from enum import Enum
from sqlalchemy import UniqueConstraint

class Faction(str, Enum):
    ALLIANCE = "ALLIANCE"
    HORDE = "HORDE"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    battle_net_id: int = Field(unique=True, index=True)  # Unique Battle.net account ID
    battle_tag: str
    email: Optional[str] = None
    api_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now, sa_column_kwargs={"onupdate": datetime.now})
    
    characters: List["Character"] = Relationship(back_populates="user")

class CharacterRole(str, Enum):
    TANK = "TANK"
    HEALER = "HEALER"
    DAMAGE = "DAMAGE"

class RosterStatus(str, Enum):
    ACTIVE = "ACTIVE"
    BENCH = "BENCH"

# Roster Character Association Model
class RosterCharacter(SQLModel, table=True):
    roster_id: Optional[int] = Field(default=None, foreign_key="roster.id", primary_key=True)
    character_id: Optional[int] = Field(default=None, foreign_key="character.id", primary_key=True)
    role: CharacterRole
    status: RosterStatus
    
    roster: "Roster" = Relationship(back_populates="roster_characters")
    character: "Character" = Relationship(back_populates="character_rosters")

    def is_guild_member(self) -> bool:
        if not (self.roster and self.roster.guild and self.character):
            return False
        return self.roster.guild.id == self.character.guild_id

# Roster Model
class Roster(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=64)
    size: int = Field(ge=10, le=60)
    guild_id: Optional[int] = Field(default=None, foreign_key="guild.id")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now, sa_column_kwargs={"onupdate": datetime.now})
    
    guild: Optional["Guild"] = Relationship(back_populates="rosters")
    roster_characters: List["RosterCharacter"] = Relationship(back_populates="roster")

class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"

class Character(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    realm: str
    level: Optional[int] = Field(default=None)
    faction: Optional[Faction] = Field(default=None)
    gender: Optional[Gender] = Field(default=None)
    playable_class: Optional[int] = Field(default=None)
    playable_race: Optional[int] = Field(default=None)
    guild_rank: Optional[int] = Field(default=None)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    guild_id: Optional[int] = Field(default=None, foreign_key="guild.id")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now, sa_column_kwargs={"onupdate": datetime.now})
    
    user: Optional[User] = Relationship(back_populates="characters")
    guild: Optional["Guild"] = Relationship(
        back_populates="members",
        sa_relationship_kwargs={"foreign_keys": "[Character.guild_id]"}
    )
    guild_led: Optional["Guild"] = Relationship(
        back_populates="guild_master",
        sa_relationship_kwargs={"foreign_keys": "[Guild.guild_master_id]"}
    )
    character_rosters: List[RosterCharacter] = Relationship(back_populates="character")
    __table_args__ = (
        UniqueConstraint('name', 'realm', name='uix_character_name_realm'),
    )

class Guild(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    realm: str
    faction: Faction
    roster_creation_rank: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now, sa_column_kwargs={"onupdate": datetime.now})
    
    guild_master_id: Optional[int] = Field(default=None, foreign_key="character.id")
    guild_master: Optional[Character] = Relationship(
        back_populates="guild_led",
        sa_relationship_kwargs={"foreign_keys": "[Guild.guild_master_id]"}
    )
    members: List[Character] = Relationship(
        back_populates="guild",
        sa_relationship_kwargs={"foreign_keys": "[Character.guild_id]"}
    )
    rosters: List[Roster] = Relationship(back_populates="guild")
    __table_args__ = (
        UniqueConstraint('name', 'realm', name='uix_guild_name_realm'),
    )

# Database configuration
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)