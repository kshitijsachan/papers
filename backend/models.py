"""SQLModel models for the paper management application."""

from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class PaperBase(SQLModel):
    """Base model for paper data."""

    title: str
    authors: str
    abstract: str | None = None
    url: str | None = None
    arxiv_url: str | None = None
    published_date: datetime | None = None


class Paper(PaperBase, table=True):
    """Paper model for database storage."""

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    read_status: bool = Field(default=False)
    notes: str | None = Field(default=None)


class PaperCreate(PaperBase):
    """Schema for creating a new paper."""

    pass


class PaperRead(PaperBase):
    """Schema for reading a paper."""

    id: int
    created_at: datetime
    read_status: bool
    notes: str | None


class PaperUpdate(SQLModel):
    """Schema for updating a paper."""

    read_status: bool | None = None
    published_date: datetime | None = None


class NotesUpdate(SQLModel):
    """Schema for updating paper notes."""

    notes: str | None
