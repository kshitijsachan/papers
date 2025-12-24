"""Database setup and session management."""

import os
from pathlib import Path
from sqlmodel import Session, SQLModel, create_engine

# Store data in ~/.papers/ by default
DATA_DIR = Path(os.environ.get("PAPERS_DATA_DIR", str(Path.home() / ".papers")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Use PostgreSQL in production, SQLite locally
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DATA_DIR}/papers.db")

# PostgreSQL URLs from Railway start with postgres://, but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


def create_db_and_tables() -> None:
    """Create database tables."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Yield a database session.

    Yields
    ------
    Session
        SQLModel database session.
    """
    with Session(engine) as session:
        yield session
