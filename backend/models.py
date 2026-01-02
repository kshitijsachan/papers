"""SQLModel models for the paper management application."""

from datetime import UTC, datetime

from sqlmodel import Field, Relationship, SQLModel


class PaperTag(SQLModel, table=True):
    """Association table for paper-tag many-to-many relationship."""

    paper_id: int = Field(foreign_key="paper.id", primary_key=True)
    tag_id: int = Field(foreign_key="tag.id", primary_key=True)


class Tag(SQLModel, table=True):
    """Tag model for categorizing papers."""

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    color: str = Field(default="#6366f1")  # Default indigo

    papers: list["Paper"] = Relationship(back_populates="tags", link_model=PaperTag)


class TagCreate(SQLModel):
    """Schema for creating a tag."""

    name: str
    color: str = "#6366f1"


class TagRead(SQLModel):
    """Schema for reading a tag."""

    id: int
    name: str
    color: str


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
    starred: bool = Field(default=False)
    notes: str | None = Field(default=None)
    experiments: str | None = Field(default=None)  # Experiment ideas inspired by paper

    tags: list["Tag"] = Relationship(back_populates="papers", link_model=PaperTag)


class PaperCreate(PaperBase):
    """Schema for creating a new paper."""

    pass


class PaperRead(PaperBase):
    """Schema for reading a paper."""

    id: int
    created_at: datetime
    read_status: bool
    starred: bool
    notes: str | None
    experiments: str | None
    tags: list[TagRead] = []


class PaperUpdate(SQLModel):
    """Schema for updating a paper."""

    read_status: bool | None = None
    starred: bool | None = None
    published_date: datetime | None = None


class NotesUpdate(SQLModel):
    """Schema for updating paper notes and experiments."""

    notes: str | None = None
    experiments: str | None = None
