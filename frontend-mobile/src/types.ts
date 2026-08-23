// Mirrors backend/schemas/*.py — update together when routes change.

// User information returned by the API.
export interface User {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  reminders_enabled: boolean;
  timezone: string;
  photo_filename: string | null;
  created_at: string;
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
export const RECORD_TYPES = ['Vaccination', 'Vet Visit', 'Medication', 'Weight', 'Symptom'] as const;
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
}