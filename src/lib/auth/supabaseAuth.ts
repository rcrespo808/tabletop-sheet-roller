import type { Session, User } from "@supabase/supabase-js";
import { getAuthConfirmUrl } from "@/lib/auth/authRedirect";
import { getSupabaseClient } from "@/lib/storage/supabaseClient";
import type { UserLevel } from "@/lib/sheets/types";

export type AppUserProfile = {
  id: string;
  email?: string;
  displayName?: string;
  userLevel: UserLevel;
  createdAt?: string;
  updatedAt?: string;
};

type AppUserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  user_level: UserLevel;
  created_at: string;
  updated_at: string;
};

export type AuthState = {
  session: Session | null;
  user: User | null;
  profile: AppUserProfile | null;
};

function rowToProfile(row: AppUserProfileRow): AppUserProfile {
  return {
    id: row.id,
    email: row.email ?? undefined,
    displayName: row.display_name ?? undefined,
    userLevel: row.user_level,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function authRedirectUrl(): string | undefined {
  if (typeof window === "undefined") return getAuthConfirmUrl();
  return getAuthConfirmUrl(window.location.origin);
}

export async function getAppUserProfile(user: User): Promise<AppUserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("app_user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("[supabaseAuth] Failed to load app profile.", error);
    return null;
  }

  if (data) return rowToProfile(data as AppUserProfileRow);

  const { data: inserted, error: insertError } = await client
    .from("app_user_profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      display_name:
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null,
      user_level: "player"
    })
    .select("*")
    .single();

  if (insertError) {
    console.warn("[supabaseAuth] Failed to create app profile.", insertError);
    return null;
  }

  return rowToProfile(inserted as AppUserProfileRow);
}

export async function getCurrentAuthState(): Promise<AuthState> {
  const client = getSupabaseClient();
  if (!client) return { session: null, user: null, profile: null };

  const { data, error } = await client.auth.getSession();
  if (error || !data.session?.user) {
    return { session: null, user: null, profile: null };
  }

  const profile = await getAppUserProfile(data.session.user);
  return { session: data.session, user: data.session.user, profile };
}

export function onAuthStateChanged(callback: (state: AuthState) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const {
    data: { subscription }
  } = client.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    if (!user) {
      callback({ session, user: null, profile: null });
      return;
    }

    getAppUserProfile(user).then((profile) => callback({ session, user, profile }));
  });

  return () => subscription.unsubscribe();
}

export async function signUpWithEmail(options: {
  email: string;
  password: string;
  displayName?: string;
  userLevel?: UserLevel;
}) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  return client.auth.signUp({
    email: options.email,
    password: options.password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: {
        display_name: options.displayName ?? null,
        user_level: options.userLevel ?? "player"
      }
    }
  });
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  return client.auth.signInWithPassword({ email, password });
}

export async function updateAppUserLevel(userLevel: UserLevel): Promise<AppUserProfile | null> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");

  const { data: sessionData } = await client.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) throw new Error("Sign in before changing your table role.");

  const { data, error } = await client
    .from("app_user_profiles")
    .update({ user_level: userLevel })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) throw error;
  return rowToProfile(data as AppUserProfileRow);
}

export async function signOut() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}
