import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { apiGet } from "@/lib/api";

export type Me = {
  signedIn: boolean;
  userId?: string;
  email?: string;
  role?: "admin" | "management";
};

let cachedMe: Me | null = null;
const subscribers = new Set<(me: Me | null) => void>();

async function fetchMe(): Promise<Me> {
  try {
    return await apiGet<Me>("/me");
  } catch {
    return { signedIn: false };
  }
}

export function useMe(): { me: Me | null; isLoading: boolean; isAdmin: boolean } {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [me, setMe] = useState<Me | null>(cachedMe);
  const [isLoading, setIsLoading] = useState(!cachedMe);

  useEffect(() => {
    const handler = (m: Me | null) => setMe(m);
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      cachedMe = { signedIn: false };
      subscribers.forEach((s) => s(cachedMe));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetchMe().then((m) => {
      cachedMe = m;
      subscribers.forEach((s) => s(cachedMe));
      setIsLoading(false);
    });
  }, [isLoaded, isSignedIn, userId]);

  return {
    me,
    isLoading,
    isAdmin: me?.role === "admin",
  };
}
