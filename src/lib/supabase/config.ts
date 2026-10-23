// Diese Werte sind öffentlich (publishable) und dürfen im Code stehen.
// Geheime Schlüssel (service_role / secret) gehören NIE hierher.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://yxwnkvvhwlnsvnjdxdle.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_fjCUR84VlXQ4UmmH6bq80Q_LYHqMhNX";
