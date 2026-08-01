import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
  title: string;
  assignee: string;
  dueDate?: string;
  cost?: string;
  store?: string;
  done: boolean;
  completedBy?: string;
};

type State = Record<Tab, Item[]>;

const PEOPLE = ["David", "Arden", "Bub&Bub"];
const STORAGE_KEYS: Record<Tab, string> = {
  chores: "bub_chores_v2",
  purchases: "bub_purchases_v2",
};

function load(tab: Tab): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[tab]);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as Item[]) : [];
  } catch {
    return [];
  }
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
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<State>({ chores: [], purchases: [] });
  const [formOpen, setFormOpen] = useState<Record<Tab, boolean>>({
    chores: false,
    purchases: false,
  });
  const [pending, setPending] = useState<{ tab: Tab; index: number } | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    setState({ chores: load("chores"), purchases: load("purchases") });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.chores, JSON.stringify(state.chores));
    localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify(state.purchases));
  }, [state, hydrated]);

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

  const addItem = (t: Tab, item: Item) => {
    setState((prev) => ({ ...prev, [t]: [item, ...prev[t]] }));
    setFormOpen((prev) => ({ ...prev, [t]: false }));
  };

  const deleteItem = (t: Tab, index: number) => {
    setState((prev) => ({ ...prev, [t]: prev[t].filter((_, i) => i !== index) }));
  };

  const confirmCompletion = (person: string) => {
    if (!pending) return;
    const { tab: t, index } = pending;
    setState((prev) => {
      const list = [...prev[t]];
      const [item] = list.splice(index, 1);
      if (!item) return prev;
      list.push({ ...item, done: true, completedBy: person });
      return { ...prev, [t]: list };
    });
    setPending(null);
    celebrate();
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
      <p className="mt-1 mb-6 text-center text-sm text-muted-foreground">
        Breathe. Record your wins. Plan the future.
      </p>

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
