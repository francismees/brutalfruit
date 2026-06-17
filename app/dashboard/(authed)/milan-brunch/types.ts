export interface RsvpRow {
  id: string;
  full_name: string;
  phone_e164: string;
  email: string;
  created_at: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
}
