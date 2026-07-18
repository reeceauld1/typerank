import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { AuthContext } from './AuthContextBase.js';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // display_name/full_name are set alongside username so Supabase
      // Studio's Auth > Users table (which reads those common metadata
      // keys) shows something other than "-".
      options: { data: { username, display_name: username, full_name: username } },
    });
    return { error: error?.message ?? null };
  };

  // Supabase's password-grant API only accepts an email (or phone) — there's
  // no username-based sign-in at that level — so a non-email identifier is
  // resolved to its email via resolve_login_email first. That RPC requires
  // the password too (verified server-side against the account's own
  // bcrypt hash) and only returns the email on a match — usernames are
  // public (every profile/leaderboard shows one), so a lookup that didn't
  // require the password would let anyone harvest every user's real email
  // by just calling it once per known username.
  const resolveEmail = async (identifier: string, password: string): Promise<string | null> => {
    if (!supabase) return null;
    if (identifier.includes('@')) return identifier;
    const { data, error } = await supabase.rpc('resolve_login_email', { p_username: identifier, p_password: password });
    if (error || !data) return null;
    return data as string;
  };

  const signIn = async (identifier: string, password: string) => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const email = await resolveEmail(identifier, password);
    if (!email) return { error: 'Invalid email/username or password.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // Links a Discord identity to the currently signed-in account. There's no
  // Discord sign-in/signup path at all — this is the only way a Discord
  // identity ever gets attached, which means it always requires an existing
  // email/password session first. Requires "Enable manual linking" turned on
  // in the Supabase dashboard's auth settings, or this comes back with an
  // error.
  const linkDiscord = async () => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const { error } = await supabase.auth.linkIdentity({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    return { error: error?.message ?? null };
  };

  const unlinkDiscord = async () => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const { data, error: identitiesError } = await supabase.auth.getUserIdentities();
    if (identitiesError) return { error: identitiesError.message };
    const discordIdentity = data.identities.find(i => i.provider === 'discord');
    if (!discordIdentity) return { error: 'No linked Discord account found.' };
    const { error } = await supabase.auth.unlinkIdentity(discordIdentity);
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  // Requires an actual email rather than accepting a username too — a
  // username-to-email resolver here would have no password to gate on the
  // way resolveEmail's sign-in path does, reopening the same
  // email-harvesting hole that used to exist (see schema_046): usernames
  // are public, so a free "give me this username's email" lookup lets
  // anyone enumerate every account's real email.
  const sendPasswordReset = async (identifier: string) => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    if (!identifier.includes('@')) return { error: 'Enter your account email to reset your password.' };
    // Deliberately doesn't distinguish "no such account" from "sent" — the
    // caller shows one message regardless, so this can't be used to
    // enumerate which emails have accounts.
    await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: null };
  };

  const updatePassword = async (password: string) => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        linkDiscord,
        unlinkDiscord,
        signOut,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
