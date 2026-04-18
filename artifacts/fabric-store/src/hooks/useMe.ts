import { useEffect, useState, useCallback } from "react";
import { apiGet } from "@/lib/api";

export type Me = {
  signedIn: boolean;
  userId?: number;
  username?: string;
  fullName?: string;
  role?: "admin" | "management";
};

let cachedMe: Me | null = null;
let inflight: Promise<Me> | null = null;
const subscribers = new Set<(me: Me | null) => void>();

async function fetchMe(): Promise<Me> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const m = await apiGet<Me>("/me");
      cachedMe = m;
      subscribers.forEach((s) => s(cachedMe));
      return m;
    } catch {
      const m = { signedIn: false };
      cachedMe = m;
      subscribers.forEach((s) => s(cachedMe));
      return m;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function refreshMe(): Promise<Me> {
  cachedMe = null;
  return fetchMe();
}

export function setCachedMe(me: Me) {
  cachedMe = me;
  subscribers.forEach((s) => s(cachedMe));
}

export function useMe(): { me: Me | null; isLoading: boolean; isAdmin: boolean; refresh: () => Promise<Me> } {
  const [me, setMe] = useState<Me | null>(cachedMe);
  const [isLoading, setIsLoading] = useState(!cachedMe);

  useEffect(() => {
    const handler = (m: Me | null) => setMe(m);
    subscribers.add(handler);
    if (!cachedMe) {
      setIsLoading(true);
      fetchMe().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  const refresh = useCallback(() => refreshMe(), []);

  return { me, isLoading, isAdmin: me?.role === "admin", refresh };
}
