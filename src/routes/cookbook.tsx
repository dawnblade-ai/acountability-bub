import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cookbook")({
  head: () => ({
    meta: [
      { title: "Bubby's Cookbook — Accountability Bub" },
      {
        name: "description",
        content: "A shared recipe book for the household. Add ingredients, steps, and notes that sync across devices.",
      },
      { property: "og:title", content: "Bubby's Cookbook — Accountability Bub" },
      {
        property: "og:description",
        content: "A shared recipe book for the household. Add ingredients, steps, and notes that sync across devices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cookbook,
});

type Ingredient = {
  quantity: number | null;
  measurement: string;
  name: string;
};

type Step = {
  stepNumber: number;
  instruction: string;
};

type Recipe = {
  id: string;
  title: string;
  description: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  created_at: string;
};

function emptyIngredient(): Ingredient {
  return { quantity: null, measurement: "", name: "" };
}

function emptyStep(): Step {
  return { stepNumber: 1, instruction: "" };
}

export function Cookbook() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<Step[]>([emptyStep()]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteStep, setDeleteStep] = useState<Record<string, number>>({});



  const fetchRecipes = useCallback(async () => {
    const { data } = await supabase
      .from("recipes")
      .select("id, title, description, ingredients, steps, created_at")
      .order("created_at", { ascending: false });
    setRecipes((data as Recipe[]) ?? []);
  }, []);

  useEffect(() => {
    void fetchRecipes();
    const channel = supabase
      .channel("cookbook-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, () => {
        void fetchRecipes();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchRecipes]);

  const updateIngredient = (index: number, patch: Partial<Ingredient>) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing))
    );
  };

  const updateStep = (index: number, instruction: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, instruction } : step))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIngredients = ingredients
      .filter((ing) => ing.name.trim())
      .map((ing) => ({
        quantity: ing.quantity != null ? Number(ing.quantity) : null,
        measurement: ing.measurement.trim(),
        name: ing.name.trim(),
      }));
    const cleanSteps = steps
      .filter((step) => step.instruction.trim())
      .map((step, index) => ({ stepNumber: index + 1, instruction: step.instruction.trim() }));

    if (!title.trim()) return;

    setStatus("saving");
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      ingredients: cleanIngredients,
      steps: cleanSteps,
    };

    if (editingId) {
      await supabase.from("recipes").update(payload).eq("id", editingId);
    } else {
      await supabase.from("recipes").insert(payload);
    }

    resetForm();
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
    await fetchRecipes();
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setIngredients([emptyIngredient()]);
    setSteps([emptyStep()]);
  };

  const startEditing = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setTitle(recipe.title);
    setDescription(recipe.description ?? "");
    setIngredients(recipe.ingredients.length ? recipe.ingredients : [emptyIngredient()]);
    setSteps(recipe.steps.length ? recipe.steps : [emptyStep()]);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecipe = async (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
    await supabase.from("recipes").delete().eq("id", id);
    await fetchRecipes();
  };


  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← Back to Accountability Bub
        </Link>

        <header className="mt-4 mb-8 rounded-2xl bg-primary p-8 text-center text-primary-foreground shadow-soft">
          <h1 className="text-3xl font-light tracking-wide">Bubby's Cookbook 🍲✨</h1>
          <p className="mt-2 text-sm opacity-90">Documenting our household masterpieces</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mb-10 rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <div className="mb-5">
            <label className="mb-1 block text-sm font-semibold text-primary">Recipe Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., White Spinach & Mushroom Lasagna"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1 block text-sm font-semibold text-primary">Description / Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this good? Any special tips?"
              rows={3}
              className="w-full resize-y rounded-lg border border-border bg-background px-4 py-3 outline-none focus:border-primary"
            />
          </div>

          <div className="mb-5 rounded-2xl bg-secondary p-5">
            <label className="mb-3 block text-sm font-semibold text-primary">Ingredients</label>
            <div className="space-y-3">
              {ingredients.map((ing, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex flex-1 flex-wrap gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={ing.quantity ?? ""}
                      onChange={(e) => updateIngredient(index, { quantity: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Qty"
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={ing.measurement}
                      onChange={(e) => updateIngredient(index, { measurement: e.target.value })}
                      placeholder="Unit (e.g., cups)"
                      className="min-w-[120px] flex-1 rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      value={ing.name}
                      onChange={(e) => updateIngredient(index, { name: e.target.value })}
                      placeholder="Ingredient (e.g., shredded cheese)"
                      

                      className="min-w-[200px] flex-[2] rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIngredients((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIngredients((prev) => [...prev, emptyIngredient()])}
              className="mt-3 w-full rounded-lg border-2 border-dashed border-primary py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              + Add Another Ingredient
            </button>
          </div>

          <div className="mb-8 rounded-2xl bg-secondary p-5">
            <label className="mb-3 block text-sm font-semibold text-primary">Preparation Steps</label>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="mt-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <textarea
                    value={step.instruction}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="Describe this step..."
                    rows={2}
                    

                    className="min-w-0 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}
                    className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
              className="mt-3 w-full rounded-lg border-2 border-dashed border-primary py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              + Add Another Step
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <button
              type="submit"
              disabled={status === "saving"}
              className="rounded-full bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "saving"
                ? "Saving..."
                : status === "saved"
                  ? "Saved! 🎉"
                  : editingId
                    ? "Update Recipe"
                    : "Save to Cookbook"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

        </form>

        <h2 className="mb-4 text-xl font-semibold">Saved Recipes</h2>
        {recipes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recipes yet. Add the first household masterpiece!</p>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <article
                key={recipe.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{recipe.title}</h3>
                    {recipe.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{recipe.description}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => startEditing(recipe)}
                    className="text-sm font-medium text-primary underline"
                    aria-label="Edit recipe"
                  >
                    Edit
                  </button>
                  <button

                    onClick={() => deleteRecipe(recipe.id)}
                    className="text-sm text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete recipe"
                  >
                    ✕
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [recipe.id]: !prev[recipe.id] }))
                  }
                  className="mt-3 text-sm font-medium text-primary underline"
                >
                  {expanded[recipe.id] ? "Hide details" : "Show details"}
                </button>

                {expanded[recipe.id] ? (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-primary">Ingredients</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i}>
                            {ing.quantity != null ? `${ing.quantity} ` : ""}
                            {ing.measurement ? `${ing.measurement} ` : ""}
                            {ing.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-primary">Steps</h4>
                      <ol className="list-decimal space-y-2 pl-5 text-sm">
                        {recipe.steps.map((step) => (
                          <li key={step.stepNumber}>{step.instruction}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
