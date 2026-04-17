const DEMO_EMAIL = "test@email.com";

export function isDemoAccount(email?: string | null): boolean {
  return email?.trim().toLowerCase() === DEMO_EMAIL;
}