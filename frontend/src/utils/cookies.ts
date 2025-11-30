/**
 * Utility functions for handling auth and cookies
 */

import { useLocation } from "preact-iso/router";
import { useEffect } from "preact/hooks";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "../api/user/profile.ts";

export const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

export function useAuthRedirect() {
  const location = useLocation();

  const { data: userInfo, isLoading, isError } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    // Don't refetch on window focus to avoid unnecessary requests
    refetchOnWindowFocus: false,
  });

  // Redirect if missing
  useEffect(() => {
    // If the query has been attempted and there was an error (e.g., no session),
    // redirect to login
    if (!isLoading && isError) {
      const redirectTo = `/login?redirectTo=${
        encodeURIComponent(location.path)
      }`;
      location.route(redirectTo, true);
    }
  }, [isLoading, isError, location]);

  // Return user info when loaded, null while loading or if error
  return {
    username: isLoading || isError ? null : userInfo?.username || null,
    isAdmin: isLoading || isError ? false : userInfo?.is_admin || false,
    isLoading,
    isError,
  };
}
