"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const handleGoogleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <Button onClick={handleGoogleLogin} disabled={loading} size="lg">
      {loading ? "Redirecting..." : "Sign in with Google"}
    </Button>
  );
}
