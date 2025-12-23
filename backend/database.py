"""Database setup and session management."""

from sqlmodel import Session, SQLModel, create_engine

DATABASE_URL = "sqlite:///./papers.db"

engine = create_engine(DATABASE_URL, echo=False)


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
