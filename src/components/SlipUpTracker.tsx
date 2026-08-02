import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const LiveTimer = ({ timestamp }: { timestamp: string }) => {
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = now - new Date(timestamp).getTime();
      if (diff < 0) return setTimeStr("0m");

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      setTimeStr(
        `${days > 0 ? days + "d " : ""}${hours > 0 ? hours + "h " : ""}${minutes}m`,
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span className="font-mono text-lg font-bold">{timeStr}</span>;
};

type Tracker = { name: string; last_slip_timestamp: string };

export const SlipUpTracker = () => {
  const [trackers, setTrackers] = useState<Tracker[]>([]);

  useEffect(() => {
    const fetchTrackers = async () => {
      const { data } = await supabase.from("slip_ups").select("*").order("name");
      if (data) setTrackers(data as Tracker[]);
    };
    void fetchTrackers();

    const channel = supabase
      .channel("slip-ups-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "slip_ups" },
        (payload) => {
          const next = payload.new as Tracker;
          setTrackers((cur) => cur.map((t) => (t.name === next.name ? next : t)));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleReset = async (name: string) => {
    const now = new Date().toISOString();
    setTrackers((cur) =>
      cur.map((t) => (t.name === name ? { ...t, last_slip_timestamp: now } : t)),
    );
    await supabase
      .from("slip_ups")
      .update({ last_slip_timestamp: now })
      .eq("name", name);
  };

  if (!trackers.length) return null;

  return (
    <div className="mb-6 flex w-full max-w-md gap-4">
      {trackers.map((t) => (
        <div
          key={t.name}
          className="flex flex-1 flex-col items-center rounded-xl border border-border bg-card p-4 shadow-soft"
        >
          <span className="mb-1 text-sm text-muted-foreground">{t.name}'s Streak</span>
          <div className="mb-3 text-foreground">
            <LiveTimer timestamp={t.last_slip_timestamp} />
          </div>
          <button
            onClick={() => handleReset(t.name)}
            className="rounded-full border border-primary px-4 py-1.5 text-xs text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Reset
          </button>
        </div>
      ))}
    </div>
  );
};
