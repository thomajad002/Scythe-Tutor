alter table public.subtype_attempt_events
  add column if not exists had_factory boolean;
