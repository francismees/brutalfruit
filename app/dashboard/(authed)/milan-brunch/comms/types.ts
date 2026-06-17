export interface MessageLogRow {
  id: string;
  created_at: string;
  sent_by: string;
  channel: "email" | "sms";
  subject: string | null;
  audience: "all" | "checked_in" | "not_checked_in";
  recipient_count: number;
  status: string;
}

export interface AudienceCounts {
  all: number;
  checked_in: number;
  not_checked_in: number;
}

export interface SampleRecipient {
  full_name: string;
  email: string;
}
