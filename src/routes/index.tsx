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
        content: "A calm shared checklist for household chores and purchases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Item = { text: string; done: boolean };
type Tab = "chores" | "purchases";

const defaultChores: Item[] = [
  { text: "Tame the dish mountain", done: false },
  { text: "Conquer the laundry", done: false },
  { text: "Walk Zeus", done: false },
  { text: "Feed Zeus", done: false },
  { text: "Feed Pickles, Tubby, and Martha", done: false },
  { text: "Scoop the litter boxes", done: false },
  { text: "Make the bed", done: false },
  { text: "Water the cherry tomatoes & houseplants", done: false },
  { text: "Clean the floors", done: false },
];

const defaultPurchases: Item[] = [
  { text: "Cat food", done: false },
  { text: "Groceries / People food", done: false },
  { text: "Cleaning supplies", done: false },
  { text: "Toilet paper", done: false },
  { text: "Medicine", done: false },
];

const STORAGE_KEYS: Record<Tab, string> = {
  chores: "bub_chores",
  purchases: "bub_purchases",
};

function load(tab: Tab, fallback: Item[]): Item[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[tab]);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Item[]) : fallback;
  } catch {
    return fallback;
  }
}

function Index() {
  const [tab, setTab] = useState<Tab>("chores");
  const [hydrated, setHydrated] = useState(false);
  const [items, setItems] = useState<Record<Tab, Item[]>>({
    chores: defaultChores,
    purchases: defaultPurchases,
  });

  useEffect(() => {
    setItems({
      chores: load("chores", defaultChores),
      purchases: load("purchases", defaultPurchases),
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.chores, JSON.stringify(items.chores));
    localStorage.setItem(STORAGE_KEYS.purchases, JSON.stringify(items.purchases));
  }, [items, hydrated]);

  const list = items[tab];

  const add = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setItems((prev) => ({ ...prev, [tab]: [{ text: value, done: false }, ...prev[tab]] }));
  };

  const toggle = (index: number) => {
    setItems((prev) => {
      const next = [...prev[tab]];
      const item = next[index];
      if (!item) return prev;
      next.splice(index, 1);
      const updated: Item = { ...item, done: !item.done };
      if (updated.done) next.push(updated);
      else next.unshift(updated);
      return { ...prev, [tab]: next };
    });
  };

  const remove = (index: number) => {
    setItems((prev) => ({ ...prev, [tab]: prev[tab].filter((_, i) => i !== index) }));
  };

  const remaining = list.filter((i) => !i.done).length;

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-5 py-10 text-foreground">
      <h1 className="text-center text-3xl font-light tracking-wide">Accountability Bub</h1>
      <p className="mt-1 mb-6 text-center text-sm text-muted-foreground">
        Breathe. Record your wins. Plan the future.
      </p>

      <div className="flex w-full max-w-md overflow-hidden rounded-xl bg-card shadow-soft">
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

      <section className="mt-5 w-full max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("entry") as HTMLInputElement;
            add(input.value);
            input.value = "";
          }}
          className="mb-5 flex overflow-hidden rounded-lg shadow-soft"
        >
          <input
            name="entry"
            type="text"
            autoComplete="off"
            placeholder={tab === "chores" ? "Add a new chore..." : "Add a new purchase..."}
            className="flex-1 bg-card px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="bg-primary px-5 py-3 text-base text-primary-foreground transition-colors hover:opacity-90"
          >
            Add
          </button>
        </form>

        <ul className="m-0 list-none p-0">
          {list.map((item, index) => (
            <li
              key={`${item.text}-${index}`}
              className={`mb-2.5 flex items-center justify-between rounded-lg p-4 shadow-card transition-all ${
                item.done ? "bg-completed line-through opacity-70" : "bg-card"
              }`}
            >
              <span className="flex-1 cursor-pointer select-none" onClick={() => toggle(index)}>
                {item.text}
              </span>
              <button
                aria-label={`Delete ${item.text}`}
                onClick={() => remove(index)}
                className="ml-3 text-xl font-bold text-destructive"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        {list.length === 0 && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            All clear here. Add something when you're ready.
          </p>
        )}

        {list.length > 0 && (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {remaining} of {list.length} left
          </p>
        )}
      </section>
    </main>
  );
}
