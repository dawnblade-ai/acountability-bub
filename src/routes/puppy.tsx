import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GuideNotes } from "@/components/GuideNotes";

export const Route = createFileRoute("/puppy")({
  head: () => ({
    meta: [
      { title: "Maybe's Care Guide — Goldendoodle Puppy Playbook" },
      {
        name: "description",
        content:
          "Grooming, ear care, vet checklist, and household integration notes for Maybe, our 10-month-old goldendoodle — plus a shared name voting box.",
      },
      { property: "og:title", content: "Maybe's Care Guide — Goldendoodle Puppy Playbook" },
      {
        property: "og:description",
        content:
          "Grooming, ear care, vet checklist, and household integration notes for our 10-month-old goldendoodle.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PuppyGuide,
});

const NAV = [
  { id: "names", label: "📛 Name Voting" },
  { id: "toolkit", label: "🛒 Doodle Toolkit" },
  { id: "grooming", label: "✂️ Grooming & Hygiene" },
  { id: "vet", label: "🏥 Vet Checklist" },
  { id: "household", label: "🐾 Household Integration" },
];

type NameRow = { id: string; name: string; votes: number };
type CheckRow = { id: string; item_key: string; label: string; checked: boolean; sort_order: number };

const bullets = "space-y-3 text-sm";

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden>🐾</span>
      <span>{children}</span>
    </li>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-8 scroll-mt-6 rounded-2xl border border-border bg-card p-6 shadow-card"
    >
      <h2 className="mb-5 border-b-2 border-border pb-3 text-2xl font-semibold">{title}</h2>
      {children}
      <GuideNotes sectionId={`puppy-${id}`} />
    </section>
  );
}

const PRODUCTS = [
  {
    emoji: "🖌️",
    name: "Chris Christensen Big G Slicker",
    priority: "High priority",
    price: "$70",
    blurb:
      "The holy grail of doodle brushes. Long angled pins reach through the dense fleece coat to the skin without scratching.",
  },
  {
    emoji: "🪮",
    name: "Steel Greyhound Comb",
    priority: "High priority",
    price: "$15",
    blurb:
      "Your lie detector. After line brushing, run this through the coat — if it snags, you found a hidden mat.",
  },
  {
    emoji: "🔋",
    name: "Electric Pet Nail Filer",
    priority: "Already purchased",
    price: "$30",
    blurb:
      "She's docile for grooming, so this is perfect. Grinds the nail slowly, no sharp squeeze like traditional clippers.",
  },
  {
    emoji: "🧴",
    name: "Ear Plucking Powder",
    priority: "Medium priority",
    price: "$12",
    blurb:
      "Essential for inner-ear dreadlocks. Rosin-based powder grips slippery ear hair so plucking is painless.",
  },
  {
    emoji: "🪥",
    name: "Enzymatic Dog Toothpaste",
    priority: "Medium priority",
    price: "$10",
    blurb:
      "Poultry-flavored paste breaks down plaque. Never use human toothpaste — xylitol is toxic to dogs.",
  },
];

function PuppyGuide() {
  const [names, setNames] = useState<NameRow[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [newName, setNewName] = useState("");

  const fetchAll = useCallback(async () => {
    const [n, c] = await Promise.all([
      supabase.from("puppy_names").select("*").order("votes", { ascending: false }),
      supabase.from("puppy_checklist").select("*").order("sort_order", { ascending: true }),
    ]);
    setNames((n.data ?? []) as NameRow[]);
    setChecks((c.data ?? []) as CheckRow[]);
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("puppy-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "puppy_names" }, () => {
        void fetchAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "puppy_checklist" }, () => {
        void fetchAll();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const addName = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = newName.trim();
    if (!value) return;
    setNewName("");
    await supabase.from("puppy_names").insert({ name: value, votes: 0 });
    await fetchAll();
  };

  const vote = async (row: NameRow) => {
    setNames((prev) =>
      [...prev.map((r) => (r.id === row.id ? { ...r, votes: r.votes + 1 } : r))].sort(
        (a, b) => b.votes - a.votes,
      ),
    );
    await supabase.from("puppy_names").update({ votes: row.votes + 1 }).eq("id", row.id);
    await fetchAll();
  };

  const removeName = async (row: NameRow) => {
    setNames((prev) => prev.filter((r) => r.id !== row.id));
    await supabase.from("puppy_names").delete().eq("id", row.id);
    await fetchAll();
  };

  const toggleCheck = async (row: CheckRow) => {
    setChecks((prev) => prev.map((r) => (r.id === row.id ? { ...r, checked: !r.checked } : r)));
    await supabase.from("puppy_checklist").update({ checked: !row.checked }).eq("id", row.id);
    await fetchAll();
  };

  const leader = names[0];

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← Back to Accountability Bub
        </Link>

        <header className="mt-4 mb-8 rounded-2xl bg-primary p-8 text-center text-primary-foreground shadow-soft">
          <h1 className="text-3xl font-light tracking-wide">The Care &amp; Keeping of “Maybe”</h1>
          <p className="mt-2 text-sm opacity-90">
            Our complete playbook for a 10-month-old goldendoodle.
          </p>
        </header>

        <div className="mb-8 flex gap-4 rounded-2xl border-l-4 border-destructive bg-destructive/10 p-5">
          <span className="text-2xl" aria-hidden>
            🩹
          </span>
          <div>
            <strong className="block">Active healing: the clipper nick</strong>
            <p className="mt-1 text-sm">
              Keep a thin layer of plain Vaseline or Neosporin on the small chest cut from her reset
              groom. Leave the protective t-shirt on until it forms a solid scar so she can't reopen
              it.
            </p>
          </div>
        </div>

        <nav className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-base font-semibold">Quick Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-completed hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </div>
        </nav>

        <Section id="names" title="📛 Official Name Voting Box">
          <p className="mb-4 text-sm text-muted-foreground">
            Still undecided? Add candidates and cast votes — everything syncs live for everyone. She's
            “Maybe” until the verdict is in.
            {leader ? (
              <>
                {" "}
                Current leader: <strong className="text-foreground">{leader.name}</strong>.
              </>
            ) : null}
          </p>

          <form onSubmit={addName} className="mb-5 flex flex-wrap gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter a name idea..."
              aria-label="New name idea"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Add candidate
            </button>
          </form>

          <ul className="m-0 list-none space-y-2 p-0">
            {names.length === 0 && (
              <li className="text-sm text-muted-foreground">No candidates yet — add the first one.</li>
            )}
            {names.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
              >
                <span className="flex-1 font-medium">{row.name}</span>
                <span className="rounded-full bg-completed px-3 py-1 text-xs font-semibold">
                  {row.votes} {row.votes === 1 ? "vote" : "votes"}
                </span>
                <button
                  onClick={() => vote(row)}
                  aria-label={`Vote for ${row.name}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-transform active:scale-110"
                >
                  👍
                </button>
                <button
                  onClick={() => removeName(row)}
                  aria-label={`Remove ${row.name}`}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="toolkit" title="🛒 The Doodle Toolkit">
          <div className="grid gap-4 sm:grid-cols-2">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="rounded-xl border border-border bg-background p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-2xl" aria-hidden>
                    {p.emoji}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      p.priority === "Already purchased"
                        ? "bg-completed text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {p.priority}
                  </span>
                </div>
                <h3 className="font-semibold">{p.name}</h3>
                <div className="mb-2 text-sm font-semibold text-primary">{p.price}</div>
                <p className="text-sm text-muted-foreground">{p.blurb}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="grooming" title="✂️ Grooming & Hygiene Protocols">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 font-semibold">Coat &amp; brushing</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                At 10 months she's deep into her coat change — soft puppy fur is falling out and
                getting trapped in coarse adult curls.
              </p>
              <ul className={bullets}>
                <Bullet>
                  <strong>Line brushing:</strong> push the coat up, brush a visible line of skin
                  underneath, drop a small section and repeat. Work from the feet up.
                </Bullet>
                <Bullet>
                  <strong>Friction zones:</strong> check armpits, behind ears, under the collar, and
                  the base of the tail daily.
                </Bullet>
                <Bullet>
                  <strong>Bathing:</strong> never bathe a matted doodle — water shrink-wraps tangles
                  tight against the skin.
                </Bullet>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Ear care</h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Doodles grow thick hair <em>inside</em> the ear canal, trapping wax and moisture —
                the cause of dreadlocks and infections.
              </p>
              <ul className={bullets}>
                <Bullet>
                  <strong>Plucking:</strong> puff ear powder into the canal, grip with fingers or
                  blunt hemostats, and pull gently. It should come away easily.
                </Bullet>
                <Bullet>
                  <strong>Cleaning:</strong> flush with a vet-approved solution, massage the ear base
                  until it squelches, let her shake, then wipe the flap with a cotton round.
                </Bullet>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Nail care (electric filer)</h3>
              <ul className={bullets}>
                <Bullet>
                  <strong>Desensitize:</strong> run the filer near her while feeding high-value treats
                  so the hum means good things.
                </Bullet>
                <Bullet>
                  <strong>Technique:</strong> support the toe firmly and file in 2–3 second bursts so
                  friction doesn't heat the nail.
                </Bullet>
                <Bullet>
                  <strong>Frequency:</strong> a little every 1–2 weeks beats one big reduction a
                  month. Nails shouldn't click on the floor.
                </Bullet>
              </ul>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Tooth care</h3>
              <ul className={bullets}>
                <Bullet>
                  <strong>Brushing:</strong> finger brush or soft toddler toothbrush with enzymatic
                  toothpaste, 3x a week.
                </Bullet>
                <Bullet>
                  <strong>Chews:</strong> VOHC-approved dental chews on off-days to scrape soft
                  tartar.
                </Bullet>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="vet" title="🏥 Veterinary & Health Checklist">
          <p className="mb-4 text-sm text-muted-foreground">
            Bring this to her first vet visit. Checkboxes are shared, so whoever takes her can tick
            things off.
          </p>
          <ul className="m-0 list-none space-y-2 p-0">
            {checks.map((row) => (
              <li key={row.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-completed p-4 text-sm">
                  <input
                    type="checkbox"
                    checked={row.checked}
                    onChange={() => toggleCheck(row)}
                    className="mt-0.5 size-5 accent-[currentColor] text-primary"
                  />
                  <span className={row.checked ? "line-through opacity-70" : ""}>{row.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 mb-3 font-semibold">⚠️ Doodle problems to watch for</h3>
          <ul className={bullets}>
            <Bullet>
              <strong>Ear infections:</strong> floppy hairy ears trap moisture — watch for head
              shaking, scratching, or a yeasty smell.
            </Bullet>
            <Bullet>
              <strong>Allergies:</strong> itchy paws, red belly, or repeat ear infections. Chicken is
              a common culprit.
            </Bullet>
            <Bullet>
              <strong>Bloat:</strong> use a slow-feeder bowl and skip intense exercise for an hour
              after eating.
            </Bullet>
            <Bullet>
              <strong>Hip dysplasia:</strong> keep her lean to reduce joint stress while she finishes
              growing.
            </Bullet>
          </ul>
        </Section>

        <Section id="household" title="🐾 Household Integration">
          <p className="mb-4 text-sm text-muted-foreground">
            A bouncy teenage puppy in an established multi-pet house takes patience — she has stamina
            and doesn't know her own size yet.
          </p>
          <ul className={bullets}>
            <Bullet>
              <strong>Meeting Zeus:</strong> introduce in a neutral open space like the yard. Keep
              play reciprocal, and separate for a forced crate nap if Maybe gets overwhelming.
            </Bullet>
            <Bullet>
              <strong>Pickles, Tubby &amp; Martha:</strong> give the cats vertical space and a
              baby-gated room the dog can't enter. Keep Maybe leashed indoors at first so you can
              interrupt any chasing.
            </Bullet>
            <Bullet>
              <strong>Routine:</strong> feed, walk, and sleep at the same times daily so she learns
              the rhythm of the house.
            </Bullet>
          </ul>
        </Section>
      </div>
    </main>
  );
}
