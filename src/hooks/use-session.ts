"use client";

import { useState, useEffect } from "react";
import { getSessionId } from "@/lib/session";

export function useSession() {
  const [sessionId, setSessionId] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);

    // Upsert session in Supabase
    async function initSession() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase
          .from("sessions")
          .upsert({ id, last_active_at: new Date().toISOString() }, { onConflict: "id" });
      } catch (e) {
        console.warn("Failed to init session in Supabase:", e);
      }
      setReady(true);
    }

    initSession();
  }, []);

  return { sessionId, ready };
}
