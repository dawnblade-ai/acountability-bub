import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SlipUpTracker } from "@/components/SlipUpTracker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accountability Bub — Roommate Chores & Purchases" },
      {
        name: "description",
        content:
          "A calm shared checklist for household chores and purchases. Breathe, record your wins, plan the future.",
      },
      { property: "og:title", content: "Accountability Bub — Roommate Chores & Purchases" },
      {
        property: "og:description",
        content: "A calm shared checklist for household chores and purchases. Breathe, record your wins, plan the future.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "chores" | "purchases";

type Item = {
  id: string;
  title: string;
  assignee: string;
  dueDate?: string | undefined;
  cost?: string | undefined;
  store?: string | undefined;
  done: boolean;
  completedBy?: string | undefined;
};


type State = Record<Tab, Item[]>;

const PEOPLE = ["David", "Arden", "Bub&Bub"];

type Row = {
  id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  cost?: number | null;
  store?: string | null;
  done: boolean;
  completed_by: string | null;
};

function toItem(row: Row): Item {
  return {
    id: row.id,
    title: row.title,
    assignee: row.assignee ?? "Any",
    dueDate: row.due_date ?? "",
    cost: row.cost != null ? String(row.cost) : "",
    store: row.store ?? "",
    done: row.done,
    completedBy: row.completed_by ?? undefined,
  };
}

function formatDateTime(dt?: string) {
  if (!dt) return null;
  return new Date(dt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Bubble = { id: number; left: number; size: number; duration: number };

function Index() {
  const [tab, setTab] = useState<Tab>("chores");
  const [state, setState] = useState<State>({ chores: [], purchases: [] });
  const [formOpen, setFormOpen] = useState<Record<Tab, boolean>>({
    chores: false,
    purchases: false,
  });
  const [pending, setPending] = useState<{ tab: Tab; index: number } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const celebrateRef = useRef<() => void>(() => {});
  const selfCompletedRef = useRef<Set<string>>(new Set());


  const fetchAll = useCallback(async () => {
    const [chores, purchases] = await Promise.all([
      supabase.from("chores").select("*").order("created_at", { ascending: false }),
      supabase.from("purchases").select("*").order("created_at", { ascending: false }),
    ]);
    setState({
      chores: (chores.data ?? []).map((r) => toItem(r as Row)),
      purchases: (purchases.data ?? []).map((r) => toItem(r as Row)),
    });
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const handleChange = (payload: {
      eventType: string;
      new: Record<string, unknown>;
      old: Record<string, unknown>;
    }) => {
      const id = (payload.new as { id?: string }).id;
      if (
        payload.eventType === "UPDATE" &&
        (payload.new as { done?: boolean }).done &&
        !(payload.old as { done?: boolean }).done &&
        !(id && selfCompletedRef.current.has(id))
      ) {
        celebrateRef.current();
      }
      if (id) selfCompletedRef.current.delete(id);
      void fetchAll();
    };

    const channel = supabase
      .channel("bub-sync")

      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, (payload) => {
        handleChange(payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "purchases" }, (payload) => {
        handleChange(payload);
      })

      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const celebrate = () => {
    const base = Date.now();
    const next: Bubble[] = Array.from({ length: 30 }, (_, i) => ({
      id: base + i,
      left: Math.random() * 100,
      size: Math.random() * 20 + 10,
      duration: Math.random() * 2 + 2,
    }));
    setBubbles((prev) => [...prev, ...next]);
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => !next.some((n) => n.id === b.id)));
    }, 4000);
  };
  celebrateRef.current = celebrate;

  const addItem = async (t: Tab, item: Omit<Item, "id">) => {
    setFormOpen((prev) => ({ ...prev, [t]: false }));
    const base = {
      title: item.title,
      assignee: item.assignee,
      due_date: item.dueDate ? new Date(item.dueDate).toISOString() : null,
      done: false,
    };
    if (t === "chores") {
      await supabase.from("chores").insert(base);
    } else {
      await supabase.from("purchases").insert({
        ...base,
        cost: item.cost ? Number(item.cost) : null,
        store: item.store || null,
      });
    }
    await fetchAll();
  };

  const deleteItem = async (t: Tab, index: number) => {
    const target = state[t][index];
    if (!target) return;
    setState((prev) => ({ ...prev, [t]: prev[t].filter((_, i) => i !== index) }));
    await supabase.from(t).delete().eq("id", target.id);
    await fetchAll();
  };

  const confirmCompletion = async (person: string) => {
    if (!pending) return;
    const { tab: t, index } = pending;
    const target = state[t][index];
    setPending(null);
    if (!target) return;
    selfCompletedRef.current.add(target.id);
    celebrate();
    await supabase.from(t).update({ done: true, completed_by: person }).eq("id", target.id);

    await fetchAll();
  };

  const list = state[tab];
  const active = list.map((item, index) => ({ item, index })).filter((x) => !x.item.done);
  const completed = list.map((item, index) => ({ item, index })).filter((x) => x.item.done);


  const renderList = (entries: { item: Item; index: number }[], emptyText: string) => (
    <ul className="m-0 list-none p-0">
      {entries.length === 0 && (
        <li className="py-3 text-sm text-muted-foreground">{emptyText}</li>
      )}
      {entries.map(({ item, index }) => (
        <li
          key={`${item.title}-${index}`}
          className={`mb-2.5 flex flex-col rounded-lg p-4 shadow-card ${
            item.done ? "bg-completed opacity-80" : "bg-card"
          }`}
        >
          <div className="mb-2 flex items-start justify-between">
            <span className={`font-semibold ${item.done ? "line-through" : ""}`}>
              {item.title}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {item.assignee && item.assignee !== "Any" && (
              <span className="rounded-full border border-border bg-background px-2 py-1">
                👤 {item.assignee}
              </span>
            )}
            {item.dueDate && (
              <span className="rounded-full border border-border bg-background px-2 py-1">
                📅 Due: {formatDateTime(item.dueDate)}
              </span>
            )}
            {tab === "purchases" && item.cost && (
              <span className="rounded-full border border-border bg-background px-2 py-1">
                💰 ${item.cost}
              </span>
            )}
            {tab === "purchases" && item.store && (
              <span className="rounded-full border border-border bg-background px-2 py-1">
                🏪 {item.store}
              </span>
            )}
            {item.done && item.completedBy && (
              <span className="rounded-full bg-primary px-2 py-1 text-primary-foreground">
                🏆 Done by {item.completedBy}
              </span>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {!item.done && (
              <button
                onClick={() => setPending({ tab, index })}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                ✓ Complete
              </button>
            )}
            <button
              onClick={() => deleteItem(tab, index)}
              className="rounded bg-secondary px-3 py-1.5 text-sm text-destructive"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-5 py-10 text-foreground">
      <style>{`@keyframes bubbleFloat{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-110vh) scale(1.5);opacity:0}}`}</style>

      <h1 className="text-center text-3xl font-light tracking-wide">Accountability Bub</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Breathe. Record your wins. Plan the future.
      </p>
      <Link
        to="/guide"
        className="mt-3 mb-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-primary shadow-card"
      >
        🪵 Coffee Table Refinishing Guide
      </Link>
      <Link
        to="/cookbook"
        className="mb-6 rounded-full border border-border bg-card px-4 py-2 text-sm text-primary shadow-card"
      >
        🍲 Bubby's Cookbook
      </Link>

      <SlipUpTracker />


      <div className="w-full max-w-md">
        <div className="flex overflow-hidden rounded-xl bg-card shadow-soft">
          {(["chores", "purchases"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-4 text-base capitalize transition-colors ${
                tab === t
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setFormOpen((p) => ({ ...p, [tab]: !p[tab] }))}
          className="mt-5 w-full rounded-lg border-2 border-dashed border-primary bg-card px-4 py-3 text-primary transition-colors hover:bg-completed"
        >
          + Add New {tab === "chores" ? "Chore" : "Purchase"}
        </button>

        {formOpen[tab] && (
          <form
            key={tab}
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const data = new FormData(f);
              const title = String(data.get("title") ?? "").trim();
              if (!title) return;
              addItem(tab, {
                title,
                assignee: String(data.get("assignee") ?? "Any"),
                dueDate: String(data.get("dueDate") ?? ""),
                ...(tab === "purchases"
                  ? {
                      cost: String(data.get("cost") ?? ""),
                      store: String(data.get("store") ?? "").trim(),
                    }
                  : {}),
                done: false,
              });
              f.reset();
            }}
            className="mt-5 rounded-lg bg-card p-4 shadow-soft"
          >
            <label className="mb-3 flex flex-col">
              <span className="mb-1 text-xs text-muted-foreground">
                {tab === "chores" ? "Chore Name" : "Item Name"}
              </span>
              <input
                name="title"
                type="text"
                autoComplete="off"
                placeholder={tab === "chores" ? "e.g., Tame the dish mountain" : "e.g., Cat food"}
                className="rounded-md border border-border bg-background px-3 py-2 outline-none"
              />
            </label>

            <label className="mb-3 flex flex-col">
              <span className="mb-1 text-xs text-muted-foreground">
                {tab === "chores" ? "Who should do this?" : "Who is buying?"}
              </span>
              <select
                name="assignee"
                defaultValue="Any"
                className="rounded-md border border-border bg-background px-3 py-2 outline-none"
              >
                <option value="Any">Anyone</option>
                {PEOPLE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {tab === "purchases" && (
              <>
                <label className="mb-3 flex flex-col">
                  <span className="mb-1 text-xs text-muted-foreground">Expected Cost ($)</span>
                  <input
                    name="cost"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 25.00"
                    className="rounded-md border border-border bg-background px-3 py-2 outline-none"
                  />
                </label>
                <label className="mb-3 flex flex-col">
                  <span className="mb-1 text-xs text-muted-foreground">Store</span>
                  <input
                    name="store"
                    type="text"
                    placeholder="e.g., Chewy, Target"
                    className="rounded-md border border-border bg-background px-3 py-2 outline-none"
                  />
                </label>
              </>
            )}

            <label className="mb-3 flex flex-col">
              <span className="mb-1 text-xs text-muted-foreground">
                {tab === "chores" ? "Due Date & Time" : "Need By"}
              </span>
              <input
                name="dueDate"
                type="datetime-local"
                className="rounded-md border border-border bg-background px-3 py-2 outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-primary py-3 text-primary-foreground"
            >
              Save {tab === "chores" ? "Chore" : "Purchase"}
            </button>
          </form>
        )}

        <h2 className="mt-6 mb-2 border-b border-border pb-1 text-lg">
          {tab === "chores" ? "To Do" : "To Buy"}
        </h2>
        {renderList(active, "Nothing here yet. Add something when you're ready.")}

        <h2 className="mt-6 mb-2 border-b border-border pb-1 text-lg">
          {tab === "chores" ? "Completed Wins" : "Purchased Wins"}
        </h2>
        {renderList(completed, "No wins recorded yet.")}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-foreground/40 px-4"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-xs rounded-xl bg-card p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-5 text-lg font-semibold">Who completed this?</h3>
            {PEOPLE.map((p) => (
              <button
                key={p}
                onClick={() => confirmCompletion(p)}
                className="mb-2.5 block w-full rounded-lg border border-border bg-background py-3 transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPending(null)}
              className="mt-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bubbles.map((b) => (
        <div
          key={b.id}
          aria-hidden
          className="pointer-events-none fixed bottom-[-50px] z-999 rounded-full bg-primary/50"
          style={{
            left: `${b.left}vw`,
            width: b.size,
            height: b.size,
            boxShadow: "inset 0 0 10px rgba(255,255,255,0.8)",
            animation: `bubbleFloat ${b.duration}s ease-in forwards`,
          }}
        />
      ))}
    </main>
  );
}
