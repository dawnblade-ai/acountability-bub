import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Coffee Table Refinishing Guide — Accountability Bub" },
      {
        name: "description",
        content:
          "Step-by-step playbook for prepping, staining, and sealing our coffee table with a water-based finish.",
      },
      { property: "og:title", content: "Coffee Table Refinishing Guide — Accountability Bub" },
      {
        property: "og:description",
        content:
          "Step-by-step playbook for prepping, staining, and sealing our coffee table with a water-based finish.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Guide,
});

const NAV = [
  { id: "toolkit", label: "🛒 The Ultimate Toolkit" },
  { id: "prep", label: "1️⃣ Final Prep & Sanding" },
  { id: "stain", label: "2️⃣ Applying the Stain" },
  { id: "poly", label: "3️⃣ Polyurethane Masterclass" },
  { id: "curing", label: "4️⃣ Drying vs. Curing" },
  { id: "drips", label: "🛠️ Fixing Dried Drips" },
  { id: "brushes", label: "🧼 Cleaning Synthetic Brushes" },
];

function Callout({
  tone,
  title,
  children,
}: {
  tone: "info" | "warning" | "danger" | "success";
  title: string;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    info: "border-primary bg-accent",
    warning: "border-primary/60 bg-completed",
    danger: "border-destructive bg-destructive/10",
    success: "border-primary bg-completed",
  };
  return (
    <div className={`my-6 rounded-r-xl border-l-4 p-5 ${tones[tone]}`}>
      <strong className="mb-1 block text-base">{title}</strong>
      <span className="text-sm">{children}</span>
    </div>
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
    <section id={id} className="mb-8 scroll-mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-5 border-b-2 border-border pb-3 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const steps = "list-decimal space-y-4 pl-5 marker:font-semibold marker:text-primary";
const bullets = "list-disc space-y-2 pl-5 text-sm";

function Guide() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← Back to Accountability Bub
        </Link>

        <header className="mt-4 mb-8 rounded-2xl bg-primary p-8 text-center text-primary-foreground shadow-soft">
          <h1 className="text-3xl font-light tracking-wide">Master Refinishing Guide</h1>
          <p className="mt-2 text-sm opacity-90">
            Our playbook for preparing, staining, and sealing a water-based finish like a pro.
          </p>
        </header>

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

        <Section id="toolkit" title="🛒 The Ultimate Toolkit & Shopping List">
          <p className="mb-5 text-sm text-muted-foreground">
            Have all materials on hand before starting a wet finish. Running out of tack cloth halfway
            through a poly coat is a nightmare.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background p-4">
              <h4 className="mb-2 border-b border-border pb-2 font-semibold">Liquids & Finishes</h4>
              <ul className={bullets}>
                <li>Water-based pre-stain wood conditioner</li>
                <li>Water-based wood stain (your color of choice)</li>
                <li>Water-based polyurethane (satin or semi-gloss)</li>
                <li>Dish soap (Dawn works best for cleanup)</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <h4 className="mb-2 border-b border-border pb-2 font-semibold">Abrasives & Dusting</h4>
              <ul className={bullets}>
                <li>Sandpaper: 120, 150, 220, 320, 400-grit</li>
                <li>Flexible sanding sponges (for leg contours)</li>
                <li>Tack cloths (2-3 packs minimum)</li>
                <li>Shop vacuum</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 sm:col-span-2">
              <h4 className="mb-2 border-b border-border pb-2 font-semibold">
                Applicators & Protection
              </h4>
              <ul className={bullets}>
                <li>High-quality synthetic brush (nylon/polyester)</li>
                <li>Lint-free cotton rags (large pack)</li>
                <li>Nitrile gloves</li>
                <li>Wooden stir sticks</li>
                <li>Blue painter's tape & sharp razor blades</li>
                <li>Ziploc bags or cling wrap</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="prep" title="Phase 1: Final Prep & Sanding">
          <p className="mb-5 text-sm text-muted-foreground">
            The table sides are already at 220-grit. Bring the detached, stripped, thinned legs up to the
            same standard so the stain absorbs identically.
          </p>
          <ol className={steps}>
            <li>
              <strong>Sand the legs:</strong> Start with 120-grit flexible sponges to remove remaining
              chemical stripper residue. Move to 150-grit, then 220-grit. Always sand <em>with</em> the
              grain (vertically up and down the leg).
            </li>
            <li>
              <strong>Handle the veneer with care:</strong> The table top is a thinned veneer. For
              touch-ups, hand-sand strictly with 220-grit using zero downward pressure. Burning through
              the veneer is irreversible.
            </li>
            <li>
              <strong>Blast the dust:</strong> Vacuum all components. With an air compressor, snap a blow
              gun onto the quick-connect hose to blast dust out of tight corners and hardware holes.
            </li>
            <li>
              <strong>The final wipe:</strong> Unfold a tack cloth and gently drag it across all surfaces
              to pick up microscopic dust.
            </li>
          </ol>
        </Section>

        <Section id="stain" title="Phase 2: Applying the Water-Based Stain">
          <p className="mb-2 text-sm text-muted-foreground">
            Water-based stain absorbs quickly rather than sitting on top. Speed and a "wipe on, wipe off"
            technique are essential.
          </p>
          <Callout tone="warning" title="Work in Small Sections">
            Do not stain the entire table top at once. Work one leg at a time, or split the top in half.
          </Callout>
          <ol className={steps}>
            <li>
              <strong>Condition the wood:</strong> Wipe on pre-stain conditioner with a rag. Let it sit
              5-10 minutes, wipe off excess, wait 30 minutes. This prevents splotching.
            </li>
            <li>
              <strong>Apply the stain:</strong> Wearing nitrile gloves, dip a lint-free rag in the stain
              and wipe it on generously, moving with the grain.
            </li>
            <li>
              <strong>Wipe off immediately:</strong> Wait no more than 1 to 3 minutes, then vigorously
              wipe away all excess with a fresh rag. Dried water-based stain turns into sticky, muddy
              paint.
            </li>
            <li>
              <strong>Knock down the grain:</strong> Dry 3-4 hours. Swollen fibers feel fuzzy — glide
              220-grit over the surface (1-2 gentle passes) and wipe clean with a tack cloth.
            </li>
          </ol>
        </Section>

        <Section id="poly" title="Phase 3: The Polyurethane Masterclass">
          <p className="mb-2 text-sm text-muted-foreground">
            Polyurethane is the armor. It requires patience, a clean environment, and specific brushing
            technique.
          </p>
          <Callout tone="danger" title="Workspace Lockdown">
            Seal the room off completely. A single stray hair from Zeus, Pickles, Tubby, or Martha
            floating into wet poly embeds permanently. Keep pets out and close windows to stop breezes.
          </Callout>
          <ol className={steps}>
            <li>
              <strong>Stir, never shake:</strong> Shaking introduces micro-bubbles that harden into the
              finish.
            </li>
            <li>
              <strong>Load and lay down:</strong> Dip the synthetic brush 1/3 of the way in. Apply long,
              continuous strokes, maintaining a wet edge.
            </li>
            <li>
              <strong>Trust the self-leveling:</strong> Never over-brush. If you spot a missed streak
              after 60 seconds, leave it — brushing tacky poly creates deep drag marks. Fix it next coat.
            </li>
            <li>
              <strong>The between-coat scuff:</strong> Let coat 1 dry fully (2-4 hours). Hand-sand with
              320 or 400-grit until a fine white powder forms, then vacuum and tack cloth.
            </li>
            <li>
              <strong>Repeat for coats 2 and 3:</strong> A coffee table needs a minimum of three coats
              for durability.
            </li>
          </ol>
          <Callout tone="success" title="💡 The Flashlight Hack">
            Have Arden stand on the opposite side with a flashlight held at a low, horizontal angle. The
            glare instantly highlights drips, dry spots, or bubbles while the poly is still wet enough to
            fix.
          </Callout>
        </Section>

        <Section id="curing" title="Phase 4: Drying vs. Curing">
          <ul className={bullets}>
            <li>
              <strong>Dry to the touch (2-4 hours):</strong> Dust won't stick. Safe to carefully move
              pieces indoors.
            </li>
            <li>
              <strong>Light use (48 hours):</strong> Safe to reattach the legs and place it in the living
              room.
            </li>
            <li>
              <strong>Fully cured (21 to 30 days):</strong> No heavy objects, hot mugs, or plants during
              the first month. Coasters are mandatory.
            </li>
          </ul>
        </Section>

        <Section id="drips" title="🛠️ Troubleshooting: Fixing a Dried Drip">
          <p className="mb-5 text-sm text-muted-foreground">
            Don't attack a hard drip with a bare finger and sandpaper — you'll sand through the
            surrounding finish while the drip stays intact.
          </p>
          <ol className={steps}>
            <li>
              <strong>Mask it off:</strong> Frame the drip tightly on all four sides with blue painter's
              tape.
            </li>
            <li>
              <strong>Shave the peak:</strong> Hold a new razor blade vertical (90°) and gently scrape
              backward to knock off the top peak.
            </li>
            <li>
              <strong>Block sand:</strong> Wrap 320 or 400-grit around a hard flat block and sand until
              the drip is flush with the tape.
            </li>
            <li>
              <strong>Feather and coat:</strong> Remove tape, feather edges with 400-grit. The cloudiness
              vanishes with the next full coat.
            </li>
          </ol>
        </Section>

        <Section id="brushes" title="🧼 Troubleshooting: Cleaning Synthetic Brushes">
          <p className="mb-2 text-sm text-muted-foreground">
            Water-based finishes skip the mineral spirits, but poly hardens fast inside brush ferrules.
          </p>
          <Callout tone="info" title="⏳ The Ziploc Hack (Between Coats)">
            Doing coats 1, 2, and 3 in one weekend? Don't wash the brush between coats — hidden moisture
            thins the next coat and causes milky streaks. Seal the wet brush in a Ziploc with the air
            squeezed out; it stays ready for hours.
          </Callout>
          <ol className={steps}>
            <li>
              <strong>The final rinse:</strong> Run warm (not hot) water through the bristles from the
              ferrule to the tips.
            </li>
            <li>
              <strong>Massage with dish soap:</strong> Work Dawn deep into the bristles until the suds
              turn slightly milky.
            </li>
            <li>
              <strong>Comb the heel:</strong> Use a brush comb (or old metal fork) to scrape from ferrule
              to tips, removing hidden poly clumps.
            </li>
            <li>
              <strong>Rinse until clear:</strong> Rinse until no soap bubbles remain, then spin out the
              excess water.
            </li>
            <li>
              <strong>Reshape and hang:</strong> Straighten the bristles, return the brush to its
              cardboard keeper, and hang it to dry. Never dry it resting on the bristles.
            </li>
          </ol>
        </Section>
      </div>
    </main>
  );
}
