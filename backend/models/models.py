from datetime import datetime, date
import enum
from sqlalchemy import String, Integer, Float, Date, DateTime, Text, ForeignKey, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

# Enum for different types of health records
class RecordType(str, enum.Enum):
    VACCINATION = "Vaccination"
    VET_VISIT = "Vet Visit"
    MEDICATION = "Medication"
    WEIGHT = "Weight"
    SYMPTOM = "Symptom"
    GROOMING = "Grooming"
    TRAINING = "Training"


# User model
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    pending_email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reminders_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    reminder_frequency: Mapped[str] = mapped_column(String(10), nullable=False, server_default="weekly")
    push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    weight_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, server_default="UTC")
    language: Mapped[str] = mapped_column(String(10), nullable=False, server_default="en")
    unit_system: Mapped[str] = mapped_column(String(10), nullable=False, server_default="metric")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")
    photo_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Foreign key relationship to pets
    pets: Mapped[list["Pet"]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    
    # Push tokens for this user's installed apps
    device_tokens: Mapped[list["DeviceToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

# Pet model
class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    species: Mapped[str] = mapped_column(String(50), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(50), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    weight_frequency: Mapped[str] = mapped_column(String(10), nullable=False, server_default="monthly")
    photo_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Foreign key relationship to user
    owner: Mapped["User"] = relationship(back_populates="pets")
    records: Mapped[list["HealthRecord"]] = relationship(
        back_populates="pet",
        cascade="all, delete-orphan",
    )
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="pet",
        cascade="all, delete-orphan",
    )
    events: Mapped[list["ScheduledEvent"]] = relationship(
        back_populates="pet",
        cascade="all, delete-orphan",
    )


# HealthRecord model
class HealthRecord(Base):
    __tablename__ = "health_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False)
    record_type: Mapped[RecordType] = mapped_column(Enum(RecordType), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    next_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Foreign key relationship to pet
    pet: Mapped["Pet"] = relationship(back_populates="records")

    # Relationship to RecordPhoto model
    photos: Mapped[list["RecordPhoto"]] = relationship(back_populates="record", cascade="all, delete-orphan")


# RecordPhoto model
class RecordPhoto(Base):
    __tablename__ = "record_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    record_id: Mapped[int] = mapped_column(Integer, ForeignKey("health_records.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    record: Mapped["HealthRecord"] = relationship(back_populates="photos")


# ChatMessage model
class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    pet: Mapped["Pet"] = relationship(back_populates="messages")


# Device token model — one row per app install that has accepted push notifications.
class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    platform: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    user: Mapped["User"] = relationship(back_populates="device_tokens")


# What produced a scheduled event. Drives the default record_type when one is completed, and lets the dashboard group or filter by source.
class EventKind(str, enum.Enum):
    APPOINTMENT = "Appointment"
    RECORD_FOLLOWUP = "Record Follow-up"
    WEIGHT_CHECKIN = "Weight Check-in"


# A thing that is due. Records author their own next_due_date and the routes mirror it here,
# so every "what's due" query reads this table and nothing else.
class ScheduledEvent(Base):
    __tablename__ = "scheduled_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    kind: Mapped[EventKind] = mapped_column(Enum(EventKind), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # The record that generated this follow-up, if any.
    source_record_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("health_records.id", ondelete="CASCADE"), nullable=True
    )
    # The record created by marking this event done, if any. Setting NULL rather than CASCADE:
    # deleting that record should not erase the history of the event being completed.
    result_record_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("health_records.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    pet: Mapped["Pet"] = relationship(back_populates="events")
    source_record: Mapped["HealthRecord | None"] = relationship(foreign_keys=[source_record_id])
    result_record: Mapped["HealthRecord | None"] = relationship(foreign_keys=[result_record_id])
    
    @property
    def record_type(self) -> "RecordType | None":
        """The source record's category, so a Due can show 'Vaccination' rather than just a title."""
        return self.source_record.record_type if self.source_record else None