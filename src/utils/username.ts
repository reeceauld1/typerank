// Shared between signup (AuthForm.tsx) and the profile page's change-name
// flow — single source of truth so both stay in sync with each other and
// with the column's own check constraint (user_stats.username in
// schema.sql: `username ~ '^[A-Za-z0-9]{3,20}$'`).
const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;

export function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 20) return 'Username must be 20 characters or fewer.';
  if (!USERNAME_PATTERN.test(username)) return 'Username can only contain letters and numbers.';
  return null;
}

// Mirrors change_username's cooldown in schema.sql — usernameChangedAt is
// null until the first use of that RPC, so a brand-new account (or one
// that's never changed its name) can always change it immediately.
const USERNAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function nextUsernameChangeAt(usernameChangedAt: string | null): Date | null {
  if (!usernameChangedAt) return null;
  const next = new Date(new Date(usernameChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS);
  return next > new Date() ? next : null;
}
