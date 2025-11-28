/**
 * Utility functions for handling cookies
 */

import { useLocation } from "preact-iso/router";
import { useEffect } from "preact/hooks";

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

export function useAuthRedirect(): string | null {
  const location = useLocation();

  // Get username (cookie from login)
  const username = getCookie("USERNAME");

  // Redirect if missing (only on client, and only once auth status settles)
  useEffect(() => {
    if (!username) {
      const redirectTo = `/login?redirectTo=${
        encodeURIComponent(location.path)
      }`;
      location.route(redirectTo, true);
    }
  }, [username]);

  return username;
}
