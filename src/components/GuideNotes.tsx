import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GuideNote = {
  id: string;
  section_id: string;
  content: string;
  author: string | null;
};

const PEOPLE = ["David", "Arden", "Bub&Bub"];

export function GuideNotes({ sectionId }: { sectionId: string }) {
  const [notes, setNotes] = useState<GuideNote[]>([]);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState(PEOPLE[0]!);

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from("guide_notes")
      .select("id, section_id, content, author")
      .eq("section_id", sectionId)
      .order("created_at", { ascending: true });
    setNotes((data as GuideNote[]) ?? []);
  }, [sectionId]);

  useEffect(() => {
    void fetchNotes();
    const channel = supabase
      .channel(`guide-notes-${sectionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guide_notes" },
        () => void fetchNotes(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchNotes, sectionId]);

  const addNote = async () => {
    const text = content.trim();
    if (!text) return;
    setContent("");
    setOpen(false);
    await supabase.from("guide_notes").insert({ section_id: sectionId, content: text, author });
    void fetchNotes();
  };

  const removeNote = async (id: string) => {
    setNotes((n) => n.filter((x) => x.id !== id));
    await supabase.from("guide_notes").delete().eq("id", id);
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">📝 Supplies & Notes</h4>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-completed hover:text-foreground"
        >
          {open ? "Cancel" : "+ Add"}
        </button>
      </div>

      {notes.length === 0 && !open ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No notes yet for this step. Add supplies, links, or reminders.
        </p>
      ) : null}

      {notes.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <span className="text-sm">
                {n.content}
                {n.author ? (
                  <span className="ml-2 text-xs text-muted-foreground">— {n.author}</span>
                ) : null}
              </span>
              <button
                type="button"
                aria-label="Delete note"
                onClick={() => void removeNote(n.id)}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="e.g. Grab another pack of 320-grit at Ace"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            <select
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs outline-none focus:border-primary"
            >
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void addNote()}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              Save note
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
