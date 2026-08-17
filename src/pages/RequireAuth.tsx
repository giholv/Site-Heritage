import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

type Props = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: Props) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      setAuthenticated(!!session?.user);
      setLoading(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!authenticated) {
    const redirect = encodeURIComponent(
      location.pathname + location.search
    );

    return (
      <Navigate
        to={`/login?redirect=${redirect}`}
        replace
      />
    );
  }

  return <>{children}</>;
}