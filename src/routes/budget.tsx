import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [
      { title: "Paycheck Budget | Accountability Bub" },
      { name: "description", content: "Zero-sum paycheck budgeting for the household — sinking funds and weekly expenses, synced live." },
      { property: "og:title", content: "Paycheck Budget | Accountability Bub" },
      { property: "og:description", content: "Zero-sum paycheck budgeting for the household — synced live." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BudgetPage,
});

type Sink = { id: string; name: string; created_week: string; completed_week: string | null };
type WeekRow = { week_key: string; income: number | null };
type SinkVal = { id: string; week_key: string; sink_id: string; amount: number | null };
type HistoryItem = { id: string; msg: string; created_at: string };
type Expense = { id: string; week_key: string; name: string; amount: number | null };

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}
function getWeekDates(offset: number) {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}
function getISO(d: Date) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? "0" + m : m}-${day < 10 ? "0" + day : day}`;
}

// --- Fireworks ---
type Particle = { x: number; y: number; c: string; r: number; vx: number; vy: number; alpha: number; decay: number };

function BudgetPage() {
  const [offset, setOffset] = useState(0);
  const [sinks, setSinks] = useState<Sink[]>([]);
  const [weeks, setWeeks] = useState<Record<string, WeekRow>>({});
  const [sinkVals, setSinkVals] = useState<SinkVal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newType, setNewType] = useState<"expense" | "sink">("expense");
  const [newName, setNewName] = useState("");
  // Local input values so typing isn't interrupted by realtime refetches
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [localVals, setLocalVals] = useState<Record<string, string>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const fireworksActiveRef = useRef(false);
  const animRef = useRef<number>(0);
  const zeroSumFiredRef = useRef(false);

  const { monday, sunday } = getWeekDates(offset);
  const weekKey = getISO(monday);

  const fetchAll = useCallback(async () => {
    const [s, w, sv, e, h] = await Promise.all([
      supabase.from("budget_sinks").select("*").order("created_at"),
      supabase.from("budget_weeks").select("*"),
      supabase.from("budget_sink_values").select("*"),
      supabase.from("budget_expenses").select("*").order("created_at"),
      supabase.from("budget_history").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (h.data) setHistory(h.data);
    if (s.data) setSinks(s.data);
    if (w.data) setWeeks(Object.fromEntries(w.data.map((r) => [r.week_key, r])));
    if (sv.data) setSinkVals(sv.data);
    if (e.data) setExpenses(e.data);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("budget-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_sinks" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_weeks" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_sink_values" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_expenses" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_history" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // --- Swipe right to open history, left to close ---
  useEffect(() => {
    let sx = 0, sy = 0;
    const start = (e: TouchEvent) => { sx = e.changedTouches[0]!.screenX; sy = e.changedTouches[0]!.screenY; };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0]!.screenX - sx;
      const dy = Math.abs(e.changedTouches[0]!.screenY - sy);
      if (dy < 60) {
        if (dx > 80) setHistoryOpen(true);
        else if (dx < -80) setHistoryOpen(false);
      }
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchend", end, { passive: true });
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchend", end);
    };
  }, []);

  async function logHistory(msg: string) {
    await supabase.from("budget_history").insert({ msg });
  }
  function logInputChange(name: string, val: string) {
    logHistory(`Updated ${name} to ${fmt.format(parseFloat(val) || 0)}`);
  }

  // --- Fireworks engine ---
  const stopFireworks = useCallback(() => {
    fireworksActiveRef.current = false;
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!fireworksActiveRef.current && !particlesRef.current.length) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (fireworksActiveRef.current && Math.random() < 0.05) {
      explode(Math.random() * canvas.width, Math.random() * (canvas.height / 2));
    }
    const ps = particlesRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]!;
      p.vx *= 0.98; p.vy *= 0.98; p.vy += 0.05; p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c;
      ctx.fill();
      if (p.alpha <= 0) ps.splice(i, 1);
    }
    animRef.current = requestAnimationFrame(animate);
  }, []);

  function explode(x: number, y: number) {
    const colors = ["#10b981", "#fbbf24", "#3b82f6", "#f43f5e", "#ffffff"];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 5 + 2;
      particlesRef.current.push({
        x, y, c: colors[Math.floor(Math.random() * colors.length)]!,
        r: Math.random() * 3 + 1,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        alpha: 1, decay: Math.random() * 0.015 + 0.01,
      });
    }
  }

  const triggerFireworks = useCallback(() => {
    if (fireworksActiveRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    fireworksActiveRef.current = true;
    explode(canvas.width / 2, canvas.height / 3);
    animate();
    setTimeout(stopFireworks, 3500);
  }, [animate, stopFireworks]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // --- Derived data ---
  const week = weeks[weekKey];
  const income = week?.income ?? null;
  const visibleSinks = sinks.filter(
    (s) => s.created_week <= weekKey && (!s.completed_week || s.completed_week >= weekKey)
  );
  const weekExpenses = expenses.filter((e) => e.week_key === weekKey);
  const sinkValFor = (sinkId: string) =>
    sinkVals.find((v) => v.week_key === weekKey && v.sink_id === sinkId)?.amount ?? null;
  const cumBalFor = (sinkId: string) => {
    const past = sinkVals
      .filter((v) => v.sink_id === sinkId && v.week_key < weekKey)
      .reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
    const local = localVals[`${weekKey}_sink_${sinkId}`];
    const cur = local !== undefined ? parseFloat(local) || 0 : Number(sinkValFor(sinkId)) || 0;
    return past + cur;
  };

  const totalOut =
    visibleSinks.reduce((sum, s) => sum + (sinkValFor(s.id) ?? 0), 0) +
    weekExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const inc = income ?? 0;
  const remaining = inc - totalOut;

  // Fireworks on zero-sum
  useEffect(() => {
    if (inc > 0 && remaining === 0) {
      if (!zeroSumFiredRef.current) {
        zeroSumFiredRef.current = true;
        triggerFireworks();
      }
    } else {
      zeroSumFiredRef.current = false;
      stopFireworks();
    }
  }, [inc, remaining, triggerFireworks, stopFireworks]);

  // --- Mutations ---
  async function updateIncome(val: string) {
    setLocalVals((p) => ({ ...p, [`${weekKey}_income`]: val }));
    const num = val === "" ? null : parseFloat(val);
    await supabase.from("budget_weeks").upsert({ week_key: weekKey, income: num, updated_at: new Date().toISOString() });
  }

  async function updateSinkVal(sinkId: string, val: string) {
    setLocalVals((p) => ({ ...p, [`${weekKey}_sink_${sinkId}`]: val }));
    const num = val === "" ? null : parseFloat(val);
    await supabase.from("budget_sink_values").upsert(
      { week_key: weekKey, sink_id: sinkId, amount: num },
      { onConflict: "week_key,sink_id" }
    );
  }

  async function updateExpVal(id: string, val: string) {
    setLocalVals((p) => ({ ...p, [`exp_${id}`]: val }));
    const num = val === "" ? null : parseFloat(val);
    await supabase.from("budget_expenses").update({ amount: num }).eq("id", id);
  }

  async function toggleSink(id: string, checked: boolean) {
    const sink = sinks.find((x) => x.id === id);
    if (sink) logHistory(`Marked '${sink.name}' as ${checked ? "Complete" : "Incomplete"}`);
    await supabase.from("budget_sinks").update({ completed_week: checked ? weekKey : null }).eq("id", id);
  }

  async function deleteSink(id: string) {
    if (confirm("Delete this sinking fund entirely?")) {
      const sink = sinks.find((x) => x.id === id);
      if (sink) logHistory(`Deleted Sinking Fund: '${sink.name}'`);
      await supabase.from("budget_sinks").delete().eq("id", id);
    }
  }

  async function deleteExp(id: string) {
    const exp = expenses.find((x) => x.id === id);
    if (exp) logHistory(`Deleted Expense: '${exp.name}'`);
    await supabase.from("budget_expenses").delete().eq("id", id);
  }

  async function saveNewItem() {
    const name = newName.trim();
    if (!name) return;
    if (newType === "sink") {
      await supabase.from("budget_sinks").insert({ name, created_week: weekKey });
      logHistory(`Created Sinking Fund: '${name}'`);
    } else {
      await supabase.from("budget_expenses").insert({ week_key: weekKey, name, amount: null });
      logHistory(`Created Expense: '${name}'`);
    }
    setNewName("");
    setModalOpen(false);
  }

  // Value resolution: local typing state wins, then server value
  const incomeVal = localVals[`${weekKey}_income`] ?? (income != null ? String(income) : "");
  const sinkInputVal = (id: string) => localVals[`${weekKey}_sink_${id}`] ?? (sinkValFor(id) != null ? String(sinkValFor(id)) : "");
  const expInputVal = (e: Expense) => localVals[`exp_${e.id}`] ?? (e.amount != null ? String(e.amount) : "");

  const weekLabel =
    offset === 0 ? "This Week" : offset === -1 ? "Last Week" : offset === 1 ? "Next Week"
    : `${Math.abs(offset)} Weeks ${offset > 0 ? "Ahead" : "Ago"}`;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const dateRange = `${monday.toLocaleDateString("en-US", opts)} - ${sunday.toLocaleDateString("en-US", opts)}`;

  const grandClass =
    remaining < 0 ? "danger" : inc > 0 && remaining === 0 ? "zero-sum" : "";
  const grandLabel =
    remaining > 0 ? "Left to Allocate" : remaining < 0 ? "Over-Allocated By"
    : inc > 0 && remaining === 0 ? "Zero-Sum Achieved!" : "Left to Allocate";

  return (
    <main className="budget-page">
      <style>{BUDGET_CSS}</style>
      <canvas ref={canvasRef} id="fireworks-canvas" />

      {/* History Panel */}
      <div className={`history-overlay ${historyOpen ? "open" : ""}`} onClick={() => setHistoryOpen(false)} />
      <div className={`history-panel ${historyOpen ? "open" : ""}`}>
        <div className="history-header">
          <h2>Activity Log</h2>
          <button className="close-history" onClick={() => setHistoryOpen(false)}>×</button>
        </div>
        <div className="history-content">
          {history.length === 0 ? (
            <div className="history-empty">No activity logged yet.<br />Add some expenses or swipe right!</div>
          ) : (
            history.map((h) => (
              <div className="history-item" key={h.id}>
                <span className="history-date">
                  {new Date(h.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="history-msg">{h.msg}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <button className="history-fab" onClick={() => setHistoryOpen(true)} title="View History">🕒</button>

      <div className="budget-container">
        <Link to="/" className="back-link">← Back to Bub</Link>

        {/* Grand Display */}
        <div className={`grand-display ${grandClass}`}>
          <div className="grand-label">{grandLabel}</div>
          <div className="grand-amount">{fmt.format(Math.abs(remaining))}</div>
        </div>

        {/* Week Navigation */}
        <div className="paycheck-nav">
          <button className="nav-btn" onClick={() => setOffset((o) => o - 1)}>←</button>
          <div className="week-info">
            <h2 className="week-title">{weekLabel}</h2>
            <span className="week-date">{dateRange}</span>
          </div>
          <button className="nav-btn" onClick={() => setOffset((o) => o + 1)}>→</button>
        </div>

        {/* Income */}
        <div className="card income-card">
          <span className="income-label">Total Paycheck Income</span>
          <div className="input-wrapper">
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={incomeVal}
              onChange={(e) => updateIncome(e.target.value)}
              onBlur={(e) => logInputChange("Income", e.target.value)}
            />
          </div>
        </div>

        {/* Sinking Funds */}
        <h3 className="section-title">
          Sinking Funds <span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>Persists</span>
        </h3>
        <div>
          {visibleSinks.length === 0 && <div className="empty-state">No active sinking funds.</div>}
          {visibleSinks.map((s) => (
            <div className="card item-card" key={s.id}>
              <div className="item-header">
                <div>
                  <span className="item-title">{s.name}</span>
                  <span className="sink-badge">Sink</span>
                </div>
                <div className="cum-bal">Balance: {fmt.format(cumBalFor(s.id))}</div>
              </div>
              <div className="item-body">
                <div style={{ flex: 1 }}>
                  <span className="input-label">This week's contribution:</span>
                  <div className="input-wrapper">
                    <input
                      type="number"
                      className="sink-input"
                      placeholder="0.00"
                      value={sinkInputVal(s.id)}
                      onChange={(e) => updateSinkVal(s.id, e.target.value)}
                      onBlur={(e) => logInputChange(s.name, e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="action-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={s.completed_week === weekKey}
                    onChange={(e) => toggleSink(s.id, e.target.checked)}
                  />
                  Mark Complete
                </label>
                <button className="delete-btn" onClick={() => deleteSink(s.id)} title="Delete entirely">🗑</button>
              </div>
            </div>
          ))}
        </div>

        {/* Regular Expenses */}
        <h3 className="section-title">
          Regular Expenses <span style={{ fontSize: "0.8rem", fontWeight: "normal" }}>This Week Only</span>
        </h3>
        <div>
          {weekExpenses.length === 0 && <div className="empty-state">No regular expenses added.</div>}
          {weekExpenses.map((e) => (
            <div className="card item-card" key={e.id}>
              <div className="item-header">
                <span className="item-title">{e.name}</span>
              </div>
              <div className="item-body">
                <div className="input-wrapper">
                  <input
                    type="number"
                    className="exp-input"
                    placeholder="0.00"
                    value={expInputVal(e)}
                    onChange={(ev) => updateExpVal(e.id, ev.target.value)}
                    onBlur={(ev) => logInputChange(e.name, ev.target.value)}
                  />
                </div>
                <button className="delete-btn" onClick={() => deleteExp(e.id)} style={{ fontSize: "1.5rem", padding: 10 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <div className="fab" onClick={() => setModalOpen(true)}>+</div>

      {/* Modal */}
      <div className={`modal-overlay ${modalOpen ? "active" : ""}`} onClick={() => setModalOpen(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Add Item</h2>
            <button className="close-modal" onClick={() => setModalOpen(false)}>×</button>
          </div>

          <div className="radio-group">
            <div
              className={`radio-btn ${newType === "expense" ? "active" : ""}`}
              data-type="expense"
              onClick={() => setNewType("expense")}
            >
              Expense
            </div>
            <div
              className={`radio-btn ${newType === "sink" ? "active" : ""}`}
              data-type="sink"
              onClick={() => setNewType("sink")}
            >
              Sinking Fund
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>
              Item Name
            </label>
            <input
              type="text"
              placeholder="e.g. Groceries, Car Repair..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNewItem()}
              autoFocus={modalOpen}
            />
          </div>

          <button className="submit-btn" onClick={saveNewItem}>Add to List</button>
        </div>
      </div>
    </main>
  );
}

const BUDGET_CSS = `
.budget-page {
  --bp-primary: #0f172a; --bp-secondary: #64748b; --bp-bg: #f8fafc;
  --bp-card: #ffffff; --bp-border: #e2e8f0; --bp-success: #10b981;
  --bp-danger: #ef4444; --bp-sink: #6366f1;
  background: var(--bp-bg); color: var(--bp-primary); min-height: 100vh;
  display: flex; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.budget-page #fireworks-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; }
.budget-page { touch-action: pan-y; }
.history-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1999; opacity: 0; pointer-events: none; transition: opacity 0.3s; backdrop-filter: blur(2px); }
.history-overlay.open { opacity: 1; pointer-events: all; }
.history-panel { position: fixed; top: 0; left: -100%; width: 85%; max-width: 350px; height: 100%; background: var(--bp-bg); z-index: 2000; box-shadow: 5px 0 25px rgba(0,0,0,0.15); transition: left 0.3s cubic-bezier(0.2,0.8,0.2,1); display: flex; flex-direction: column; }
.history-panel.open { left: 0; }
.history-header { padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid var(--bp-border); display: flex; justify-content: space-between; align-items: center; background: var(--bp-card); }
.history-header h2 { margin: 0; font-size: 1.3rem; color: var(--bp-primary); }
.close-history { background: none; border: none; font-size: 2rem; color: var(--bp-secondary); cursor: pointer; line-height: 1; }
.history-content { padding: 1.5rem; overflow-y: auto; flex: 1; }
.history-item { margin-bottom: 1.2rem; border-left: 2px solid var(--bp-border); padding-left: 12px; position: relative; }
.history-item::before { content: ''; position: absolute; left: -6px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--bp-primary); border: 2px solid var(--bp-bg); }
.history-date { display: block; font-size: 0.75rem; color: var(--bp-secondary); margin-bottom: 0.3rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.history-msg { font-size: 0.95rem; font-weight: 600; color: var(--bp-primary); line-height: 1.4; }
.history-empty { text-align: center; color: var(--bp-secondary); font-size: 0.9rem; margin-top: 2rem; font-style: italic; }
.history-fab { position: fixed; top: 1rem; left: 1rem; z-index: 100; background: var(--bp-card); border: 1px solid var(--bp-border); border-radius: 50%; width: 45px; height: 45px; font-size: 1.2rem; box-shadow: 0 4px 10px rgba(0,0,0,0.08); cursor: pointer; display: flex; justify-content: center; align-items: center; transition: transform 0.2s; }
.history-fab:active { transform: scale(0.9); background: var(--bp-border); }
.budget-container { max-width: 500px; width: 100%; padding: 1rem; padding-bottom: 6rem; }
.back-link { display: inline-block; margin-bottom: 0.75rem; color: var(--bp-secondary); font-size: 0.9rem; text-decoration: none; font-weight: 600; }
.grand-display { margin-top: 2.5rem; background: var(--bp-primary); color: white; text-align: center; padding: 2.5rem 1rem; border-radius: 20px; margin-bottom: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative; overflow: hidden; transition: all 0.5s ease; }
.grand-display.zero-sum { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 10px 30px rgba(16,185,129,0.4); animation: pulse-glow 2s infinite; }
.grand-display.danger { background: linear-gradient(135deg, #ef4444, #b91c1c); }
@keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); } 70% { box-shadow: 0 0 0 15px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
.grand-label { font-size: 1rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-bottom: 0.5rem; }
.grand-amount { font-size: 3.5rem; font-weight: 800; margin: 0; line-height: 1; }
.paycheck-nav { display: flex; justify-content: space-between; align-items: center; background: var(--bp-card); border-radius: 12px; padding: 0.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.nav-btn { background: none; border: none; font-size: 1.2rem; color: var(--bp-primary); width: 40px; height: 40px; border-radius: 8px; cursor: pointer; }
.nav-btn:active { background: var(--bp-border); }
.week-info { text-align: center; }
.week-title { font-weight: 700; margin: 0; font-size: 1rem; }
.week-date { font-size: 0.8rem; color: var(--bp-secondary); }
.section-title { font-size: 1.1rem; color: var(--bp-secondary); margin: 1.5rem 0 0.8rem 0; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.card { background: var(--bp-card); border-radius: 12px; padding: 1.2rem; margin-bottom: 0.8rem; box-shadow: 0 2px 5px rgba(0,0,0,0.03); border: 1px solid var(--bp-border); }
.income-card { border-color: #cbd5e1; background: #f8fafc; }
.income-label { font-weight: 700; font-size: 1.1rem; display: block; margin-bottom: 0.5rem; color: var(--bp-primary); }
.input-wrapper { position: relative; width: 100%; }
.input-wrapper::before { content: "$"; position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-weight: bold; color: var(--bp-secondary); font-size: 1.1rem; }
.budget-page input[type="number"] { width: 100%; padding: 0.8rem 0.8rem 0.8rem 2.2rem; border: 2px solid var(--bp-border); border-radius: 10px; font-size: 1.2rem; font-weight: 700; box-sizing: border-box; background: #fff; transition: border-color 0.2s; color: var(--bp-primary); }
.budget-page input[type="number"]:focus { outline: none; border-color: var(--bp-primary); }
.budget-page input[type="number"]::placeholder { color: #cbd5e1; }
.item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; }
.cum-bal { font-weight: 700; color: var(--bp-primary); font-size: 0.95rem; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; margin-top: 4px; display: inline-block; }
.input-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--bp-secondary); margin-bottom: 0.4rem; }
.item-title { font-weight: 700; font-size: 1.1rem; }
.sink-badge { background: #e0e7ff; color: var(--bp-sink); font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px; text-transform: uppercase; font-weight: 800; }
.item-body { display: flex; gap: 1rem; align-items: center; }
.item-body .input-wrapper { flex: 1; }
.action-row { display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.8rem; border-top: 1px dashed var(--bp-border); }
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; color: var(--bp-secondary); font-weight: 600; cursor: pointer; user-select: none; }
.checkbox-label input[type="checkbox"] { width: 22px; height: 22px; cursor: pointer; accent-color: var(--bp-success); }
.delete-btn { background: none; border: none; color: var(--bp-danger); font-size: 1.2rem; padding: 5px; cursor: pointer; opacity: 0.5; }
.delete-btn:hover { opacity: 1; }
.empty-state { text-align: center; padding: 1.5rem; color: var(--bp-secondary); background: transparent; border: 2px dashed var(--bp-border); border-radius: 12px; font-size: 0.95rem; font-weight: 500; }
.fab { position: fixed; bottom: 2rem; right: 50%; transform: translateX(50%); width: 65px; height: 65px; background: var(--bp-primary); color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 2.5rem; box-shadow: 0 10px 20px rgba(0,0,0,0.2); cursor: pointer; z-index: 100; }
.fab:active { background: #334155; transform: translateX(50%) scale(0.95); }
@media (min-width: 550px) { .fab { right: calc(50% - 220px); transform: none; } .fab:active { transform: scale(0.95); } }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: flex-end; z-index: 1000; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
.modal-overlay.active { opacity: 1; pointer-events: all; }
.modal-content { background: var(--bp-bg); width: 100%; max-width: 500px; border-radius: 24px 24px 0 0; padding: 1.5rem; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.modal-overlay.active .modal-content { transform: translateY(0); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 { margin: 0; font-size: 1.5rem; }
.close-modal { background: none; border: none; font-size: 2.5rem; color: var(--bp-secondary); cursor: pointer; line-height: 1; }
.radio-group { display: flex; gap: 10px; margin-bottom: 1.5rem; }
.radio-btn { flex: 1; text-align: center; padding: 0.8rem; background: var(--bp-card); border: 2px solid var(--bp-border); border-radius: 10px; font-weight: 600; cursor: pointer; }
.radio-btn.active[data-type="expense"] { border-color: var(--bp-primary); background: #f1f5f9; color: var(--bp-primary); }
.radio-btn.active[data-type="sink"] { border-color: var(--bp-sink); background: #eef2ff; color: var(--bp-sink); }
.budget-page input[type="text"] { width: 100%; padding: 1rem; border: 2px solid var(--bp-border); border-radius: 10px; font-size: 1.1rem; box-sizing: border-box; font-weight: 600; }
.budget-page input[type="text"]:focus { outline: none; border-color: var(--bp-primary); }
.submit-btn { width: 100%; padding: 1.2rem; background: var(--bp-primary); color: white; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 700; cursor: pointer; margin-top: 1.5rem; }
`;
