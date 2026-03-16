"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Unlink, RefreshCw } from "lucide-react";
import { ProgressBar, useProgressEstimate } from "@/components/ui/progress-bar";
import { createClient } from "@/lib/supabase/client";

interface PinterestConnectProps {
  sessionId: string;
  onContentAdded: () => void;
}

export function PinterestConnect({
  sessionId,
  onContentAdded,
}: PinterestConnectProps) {
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const syncProgress = useProgressEstimate(syncing, 10000);

  useEffect(() => {
    async function checkConnection() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("connected_accounts")
          .select("platform_username")
          .eq("session_id", sessionId)
          .eq("platform", "pinterest")
          .single();

        if (data) {
          setConnected(true);
          setUsername(data.platform_username);
        }
      } catch {
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) checkConnection();
  }, [sessionId]);

  const handleConnect = () => {
    window.location.href = `/api/auth/pinterest?sessionId=${sessionId}`;
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/pinterest/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSyncResult(data.error || "Sync failed");
      } else {
        setSyncResult(data.message);
        onContentAdded();
      }
    } catch {
      setSyncResult("Something went wrong");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    const supabase = createClient();
    await supabase
      .from("connected_accounts")
      .delete()
      .eq("session_id", sessionId)
      .eq("platform", "pinterest");

    setConnected(false);
    setUsername(null);
    setSyncResult(null);
  };

  if (loading) return null;
  if (!available) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-medium text-n-700">Pinterest boards</p>
          <p className="text-[12px] text-n-400">
            {connected
              ? `Connected as ${username || "Pinterest user"}`
              : "Connect to auto-import pins"}
          </p>
        </div>
        {connected ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-n-200 bg-n-0 px-3.5 py-1.5 text-[13px] font-medium text-n-600 transition-colors hover:bg-n-50 hover:border-lavender-400/30 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {syncing ? "Syncing..." : "Sync"}
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded-full p-1.5 text-n-300 transition-colors hover:text-rose-400 hover:bg-rose-50"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-n-200 bg-n-0 px-3.5 py-1.5 text-[13px] font-medium text-n-600 transition-colors hover:bg-n-50 hover:border-lavender-400/30"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Connect
          </button>
        )}
      </div>

      {syncing && <ProgressBar progress={syncProgress} />}
      {syncResult && (
        <p className="text-[12px] text-lavender-500">{syncResult}</p>
      )}
    </div>
  );
}
