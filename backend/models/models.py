import enum
from datetime import date, datetime, timedelta
from datetime import time as time_type

from database import Base
from sqlalchemy import ARRAY, Boolean, Date, DateTime, Enum, Float, ForeignKey, Integer, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship


# Enum for different types of health records
class RecordType(str, enum.Enum):
    VACCINATION = "Vaccination"
    VET_VISIT = "Vet Visit"
    MEDICATION = "Medication"
    WEIGHT = "Weight"
    SYMPTOM = "Symptom"
    GROOMING = "Grooming"
    TRAINING = "Training"

# Length of the free trial every new account starts with. One month, counted as 30 days.
TRIAL_DAYS = 30

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
    walk_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    feeding_email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    feeding_push_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, server_default="UTC")
    language: Mapped[str] = mapped_column(String(10), nullable=False, server_default="en")
    unit_system: Mapped[str] = mapped_column(String(10), nullable=False, server_default="metric")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")
    photo_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    # Premium. Access is worked out from these fields on every check, never stored as one state. A new account gets TRIAL_DAYS from signup, and registration shortens that for an email that already had its trial.
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now() + timedelta(days=TRIAL_DAYS))
    # "purchased" (kept in step with RevenueCat) or "granted" (from the command line). None means never premium.
    premium_source: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # When premium ends. Empty with premium_source "granted" means lifetime.
    premium_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # False once the store reports that a purchase won't renew, so the owner is warned before premium runs out. Kept in step with RevenueCat.
    premium_renews: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    # The last lock warning sent (7, 3 or 1 days before the trial or a premium that won't renew ends), so each goes out once. Cleared when premium is renewed or bought.
    lock_warning_sent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Set by the first web checkout. Opens Stripe's billing portal, and lets account deletion cancel a web subscription.
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

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
    sex: Mapped[str | None] = mapped_column(String(10), nullable=True)
    neutered: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    weight_frequency: Mapped[str] = mapped_column(String(10), nullable=False, server_default="monthly")
    walk_tracking_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    monthly_budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    dietary_restrictions: Mapped[list[str]] = mapped_column(ARRAY(String(100)), nullable=False, server_default="{}")
    disabilities: Mapped[list[str]] = mapped_column(ARRAY(String(100)), nullable=False, server_default="{}")
    photo_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    # Foreign key relationship to user
    owner: Mapped["User"] = relationship(back_populates="pets")
    walks: Mapped[list["Walk"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
    feeding_times: Mapped[list["FeedingTime"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
    feedings: Mapped[list["Feeding"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
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
    photos: Mapped[list["RecordPhoto"]] = relationship(back_populates="record", cascade="all, delete-orphan", order_by="RecordPhoto.id")


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


# Walk tracking. Logged walks are logged after the fact. No GPS or schedule is required. The dashboard only shows whether the pet walked that day or not.
class Walk(Base):
    __tablename__ = "walks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    pet: Mapped["Pet"] = relationship(back_populates="walks")


# A scheduled feeding time. Having at least one is what opts a pet into feeding tracking — there is no
# separate switch, because a schedule already states the intent. Times snap to 15-minute increments so
# every slot coincides exactly with a tick of the feeding reminder job.
class FeedingTime(Base):
    __tablename__ = "feeding_times"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    time: Mapped[time_type] = mapped_column(Time, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    pet: Mapped["Pet"] = relationship(back_populates="feeding_times")


# Logged feeding. Free-standing. It carries its own real time and is matched to a scheduled slot.
# The amount is a number plus the unit the person actually measured in, stored as typed and never converted.
class Feeding(Base):
    __tablename__ = "feedings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[time_type] = mapped_column(Time, nullable=False)
    food: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    amount_unit: Mapped[str | None] = mapped_column(String(10), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    pet: Mapped["Pet"] = relationship(back_populates="feedings")


# Per-pet spending. An expense can attach to a health record so a vet visit carries its cost. The FK is SET NULL rather than CASCADE. Deleting the record should not erase what the pet's owner actually paid.
class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True)
    record_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("health_records.id", ondelete="SET NULL"), nullable=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    # Stamped from the owner's currency setting at write time, so changing that setting later never affects the recorded currency of past expenses.
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    pet: Mapped["Pet"] = relationship(back_populates="expenses")
    record: Mapped["HealthRecord | None"] = relationship()


# An email that already had its free month, kept as a keyed hash and never as the address itself. Written when an account is deleted or changes its email, read at registration, and removed a year after it was written.
class TrialFingerprint(Base):
    __tablename__ = "trial_fingerprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    # Trial days a returning account gets back. Only above zero when an account was deleted during its trial.
    days_left: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # "deleted" or "email_changed"
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


# One row per question asked, written by /ask and kept apart from the chat, so deleting messages can't reset the trial's daily allowance. The admin dashboard reads it too.
class QuestionUsage(Base):
    __tablename__ = "question_usage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)