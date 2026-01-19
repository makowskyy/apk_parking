import { API_BASE } from "../../api/config";
import type { ZoneKey } from "../constants/zones";

const DEFAULT_API_URL = API_BASE;
const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(
  /\/$/,
  ""
);

export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  defaultZone: ZoneKey;
  defaultDurationMin: number;
  notifyBeforeEnd: boolean;
  allowMarketing: boolean;
  paymentMethodLabel: string;
};

export const defaultUserProfile: UserProfile = {
  fullName: "",
  email: "",
  phone: "",
  defaultZone: "A",
  defaultDurationMin: 60,
  notifyBeforeEnd: true,
  allowMarketing: false,
  paymentMethodLabel: "",
};

type DbUserProfile = {
  id: number | string;
  email?: string;
  name?: string;
  fullName?: string;
  phone?: string;
  defaultZone?: ZoneKey;
  defaultDurationMin?: number;
  notifyBeforeEnd?: boolean;
  allowMarketing?: boolean;
  paymentMethodLabel?: string;
};

type ProfileFallback = {
  email?: string;
  fullName?: string;
};

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function normalizeProfile(
  user: DbUserProfile,
  fallback?: ProfileFallback
): UserProfile {
  const zone =
    user.defaultZone === "A" || user.defaultZone === "B" || user.defaultZone === "C"
      ? user.defaultZone
      : defaultUserProfile.defaultZone;
  const duration =
    typeof user.defaultDurationMin === "number" && Number.isFinite(user.defaultDurationMin)
      ? user.defaultDurationMin
      : defaultUserProfile.defaultDurationMin;
  const notify =
    typeof user.notifyBeforeEnd === "boolean"
      ? user.notifyBeforeEnd
      : defaultUserProfile.notifyBeforeEnd;
  const marketing =
    typeof user.allowMarketing === "boolean"
      ? user.allowMarketing
      : defaultUserProfile.allowMarketing;

  return {
    ...defaultUserProfile,
    fullName: user.fullName ?? user.name ?? fallback?.fullName ?? "",
    email: user.email ?? fallback?.email ?? "",
    phone: user.phone ?? "",
    defaultZone: zone,
    defaultDurationMin: duration,
    notifyBeforeEnd: notify,
    allowMarketing: marketing,
    paymentMethodLabel: user.paymentMethodLabel ?? "",
  };
}

export async function fetchUserProfile(
  userId: number | string,
  fallback?: ProfileFallback
): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(String(userId))}`);
  const user = await handle<DbUserProfile>(res);
  return normalizeProfile(user, fallback);
}

export async function updateUserProfile(
  userId: number | string,
  profile: UserProfile
): Promise<UserProfile> {
  const payload = { ...profile, name: profile.fullName };
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(String(userId))}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const user = await handle<DbUserProfile>(res);
  return normalizeProfile(user, { email: profile.email, fullName: profile.fullName });
}

export async function patchUserProfile(
  userId: number | string,
  partial: Partial<UserProfile>
): Promise<UserProfile> {
  const payload = {
    ...partial,
    ...(partial.fullName ? { name: partial.fullName } : {}),
  };
  const res = await fetch(`${API_URL}/users/${encodeURIComponent(String(userId))}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const user = await handle<DbUserProfile>(res);
  return normalizeProfile(user, { email: partial.email, fullName: partial.fullName });
}
