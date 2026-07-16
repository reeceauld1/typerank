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
  // resolved to its email via get_email_for_username first.
  const resolveEmail = async (identifier: string): Promise<string | null> => {
    if (!supabase) return null;
    if (identifier.includes('@')) return identifier;
    const { data, error } = await supabase.rpc('get_email_for_username', { p_username: identifier });
    if (error || !data) return null;
    return data as string;
  };

  const signIn = async (identifier: string, password: string) => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const email = await resolveEmail(identifier);
    if (!email) return { error: 'Invalid email/username or password.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithDiscord = async () => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  };

  // Links a Discord identity to the currently signed-in account (as opposed
  // to signInWithDiscord, which starts/continues a session). Requires
  // "Enable manual linking" turned on in the Supabase dashboard's auth
  // settings, or this comes back with an error.
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

  const sendPasswordReset = async (identifier: string) => {
    if (!supabase) return { error: 'Accounts are not configured yet.' };
    const email = await resolveEmail(identifier);
    // Deliberately doesn't distinguish "no such account" from "sent" — the
    // caller shows one message regardless, so this can't be used to
    // enumerate which usernames/emails have accounts.
    if (email) {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    }
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
        signInWithDiscord,
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
