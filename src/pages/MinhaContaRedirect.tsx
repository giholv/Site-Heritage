import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function MinhaContaRedirect() {
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkRole() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (active) setRedirectTo("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (!active) return;

        if (profileError || !profile) {
          setRedirectTo("/login");
          return;
        }

        if (profile.role === "admin") {
          setRedirectTo("/admin");
        } else {
          setRedirectTo("/conta");
        }
      } catch {
        if (active) setRedirectTo("/login");
      } finally {
        if (active) setLoading(false);
      }
    }

    checkRole();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return <Navigate to={redirectTo || "/login"} replace />;
}