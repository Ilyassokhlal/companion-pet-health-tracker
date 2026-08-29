// Mirrors backend/schemas/*.py — update together when routes change.

// How often the due-soon email goes out. Weekly lands on Sunday.
export const REMINDER_FREQUENCIES = ['daily', 'weekly'] as const;
export type ReminderFrequency = typeof REMINDER_FREQUENCIES[number];

// How often a pet's weight check-in is scheduled.
export const WEIGHT_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
export type WeightFrequency = typeof WEIGHT_FREQUENCIES[number];

// The measurement systems offered in Settings. Storage is always metric; this is display only.
export const UNIT_SYSTEMS = ['metric', 'imperial'] as const;
export type UnitSystem = typeof UNIT_SYSTEMS[number];

// The currencies offered in Settings. Deliberately not the full ISO list.
// The backend accepts any three uppercase letters, so this can grow without a migration.
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'RUB', name: 'Russian Ruble' },
] as const;

// UI languages, labelled in their own script so someone can find their language whatever the interface is currently set to and find their way back out of one they cannot read...I been there myself.
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ar', name: 'العربية' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
] as const;
export type LanguageCode = typeof LANGUAGES[number]['code'];

// User information returned by the API.
export interface User {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  reminders_enabled: boolean;
  reminder_frequency: ReminderFrequency;
  push_enabled: boolean;
  weight_tracking_enabled: boolean;
  walk_tracking_enabled: boolean;
  feeding_email_enabled: boolean;
  feeding_push_enabled: boolean;
  timezone: string;
  photo_filename: string | null;
  created_at: string;
  language: string;
  unit_system: string;
  currency: string;
}

// Token response returned by the API upon successful authentication.
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Pet information returned by the API.
export interface Pet {
  id: number;
  user_id: number;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  weight_tracking_enabled: boolean;
  walk_tracking_enabled: boolean;
  weight_frequency: WeightFrequency;
  dietary_restrictions: string[];
  disabilities: string[];
  photo_filename: string | null;
  created_at: string;
}

// A function to verify the user's email using a token.
export async function verifyEmail(token: string): Promise<User> {
  // POST /auth/verify-email with { token }, returns the updated user
  const response = await fetch('/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    throw new Error('Failed to verify email');
  }
  return response.json();
}

// A function to resend the verification email.
export async function resendVerification(): Promise<void> {
  const response = await fetch('/auth/resend-verification', {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to resend verification email');
  }
}

// This constant defines the types of health records that can be associated with a pet. It is used for filtering and categorizing health records in the application.
export const RECORD_TYPES = ['Vaccination', 'Vet Visit', 'Medication', 'Weight', 'Symptom', 'Grooming', 'Training'] as const;
export type RecordType = typeof RECORD_TYPES[number];

// Health record information returned by the API.
export interface HealthRecord {
  id: number;
  pet_id: number;
  record_type: RecordType;
  title: string;
  description: string | null;
  date: string;
  next_due_date: string | null;
  weight_kg: number | null;
  created_at: string;
}

// Event kinds that can be associated with a scheduled event. This constant is used for filtering and categorizing events in the application.
export const EVENT_KINDS = ['Appointment', 'Record Follow-up', 'Weight Check-in'] as const;
export type EventKind = typeof EVENT_KINDS[number];

// Scheduled event information returned by the API. This includes appointments, record follow-ups, and weight check-ins for a pet.
export interface ScheduledEvent {
  id: number;
  pet_id: number;
  title: string;
  kind: EventKind;
  due_date: string;
  completed_at: string | null;
  source_record_id: number | null;
  result_record_id: number | null;
  record_type: RecordType | null;
  created_at: string;
}

// Citation information returned by the API.
export interface Citation {
  title: string;
  section: string;
  url: string;
}

// Chat message information returned by the API.
export interface ChatMessage {
  id: number;
  pet_id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: Citation[];
  created_at: string;
}

// Photo information returned by the API.
export interface RecordPhoto {
  id: number;
  record_id: number;
  filename: string;
  created_at: string;
}

// Photo information for the gallery view returned by the API. This interface is used to represent photos associated with health records in a simplified format for display in a gallery.
export interface GalleryPhoto {
  id: number;
  record_id: number;
  filename: string;
  record_title: string;
  record_date: string;
  record_type: RecordType;
}

// Walk information returned by the API. This includes details about individual walks for a pet, such as the date, duration, distance, and any notes.
export interface Walk {
  id: number;
  pet_id: number;
  date: string;
  duration_minutes: number;
  distance_km: number | null;
  notes: string | null;
  created_at: string;
}

// Scheduled feeding time information returned by the API. This includes the time of the feeding for a pet.
export interface FeedingTime {
  id: number;
  pet_id: number;
  time: string;
}

// Feeding information returned by the API. This includes details about individual feedings for a pet, such as the date, time, food, amount, and any notes.
export interface Feeding {
  id: number;
  pet_id: number;
  date: string;
  time: string;
  food: string | null;
  amount: number | null;
  amount_unit: string | null;
  notes: string | null;
  created_at: string;
}

// Units of measurement for the amount of food in a feeding. This constant is used to standardize the units across the application.
export const AMOUNT_UNITS = ['g', 'kg', 'ml', 'l', 'cup', 'oz'] as const;
export type AmountUnit = typeof AMOUNT_UNITS[number];

// Status of a scheduled feeding time slot. Indicates whether the feeding has been met, is due, was missed, or is upcoming.
export interface SlotStatus {
  time: string;
  status: "met" | "due" | "missed" | "upcoming";
}