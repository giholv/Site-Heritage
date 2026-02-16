import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AdminGuard() {
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return setOk(false);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) return setOk(false);
      setOk(profile?.role === "admin");
    })();
  }, []);

  if (ok === null) return <div className="p-6">Carregando...</div>;
  return ok ? <Outlet /> : <Navigate to="/login" replace />;
}
