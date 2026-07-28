"use client";
import { useState, useEffect, useRef, useCallback } from "react";

/* ── Палитра «рассвет над водой» ── */
const C = {
  lagoon: "#A8E6E1", cream: "#FDF4E3", peach: "#FFD9B3",
  ink: "#33484A", mist: "#7FA09C", faint: "#A9C0BC",
  mint: "#12A278", mintSoft: "#4EC4A0",
  gold: "#F5A623", goldDeep: "#E8912D",
  coral: "#F07860", coralDeep: "#E05A45", ember: "#D64545",
  card: "#FFFFFF", line: "#E4EFEA", well: "#F2F8F5",
};
const PROJ_COLORS = ["#12A278", "#F5A623", "#F07860", "#6FAEDB", "#A98BD4", "#E48FB4", "#8FBF6B", "#D9B24A"];

const COLS = [
  { id: "backlog", name: "Бэклог" },
  { id: "wip", name: "В работе" },
  { id: "review", name: "На проверке" },
  { id: "done", name: "Готово" },
];

const KINDS = [
  { id: "report", name: "отчётность", icon: "📊", color: "#6FAEDB" },
  { id: "task", name: "задача", icon: "✅", color: "#12A278" },
  { id: "research", name: "исследование", icon: "🔍", color: "#A98BD4" },
];

/* ── Вердикты ── */
const DAY_V = [
  [0, "чисто", C.mist], [2, "лайтово", C.mintSoft], [4, "рабочий ритм", C.mint],
  [6, "плотно", C.gold], [8, "многовато", C.goldDeep], [10, "ебошилово", C.coral],
  [13, "пздц", C.coralDeep], [Infinity, "я сдохъ", C.ember],
];
const WEEK_V = [
  [0, "чисто", C.mist], [10, "лайтово", C.mintSoft], [20, "рабочий ритм", C.mint],
  [30, "плотно", C.gold], [40, "многовато", C.goldDeep], [50, "ебошилово", C.coral],
  [65, "пздц", C.coralDeep], [Infinity, "я сдохъ", C.ember],
];
const MONTH_V = [
  [0, "чисто", C.mist], [40, "лайтово", C.mintSoft], [85, "рабочий ритм", C.mint],
  [130, "плотно", C.gold], [170, "многовато", C.goldDeep], [215, "ебошилово", C.coral],
  [280, "пздц", C.coralDeep], [Infinity, "я сдохъ", C.ember],
];
const WIP_V = [
  [1, "ничего в работе", C.mist], [3, "под контролем", C.mint], [4, "норм загрузка", C.mint],
  [6, "плотно", C.gold], [8, "перегруз, разгрузись", C.coral], [Infinity, "жесть, набрала слишком много", C.ember],
];
function verdict(table, val) {
  for (const [lim, label, color] of table) { if (val < lim || (val === 0 && lim === 0)) return { label, color }; }
  const last = table[table.length - 1]; return { label: last[1], color: last[2] };
}
function verdictHours(table, h) {
  if (h === 0) return { label: table[0][1], color: table[0][2] };
  for (let i = 1; i < table.length; i++) { if (h < table[i][0]) return { label: table[i][1], color: table[i][2] }; }
  const last = table[table.length - 1]; return { label: last[1], color: last[2] };
}

/* ── Хранилище: localStorage + Supabase ── */
const KEY = "pahometr-v1";
const SB_URL = "https://zycbnenagwcnjufzlqna.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2JuZW5hZ3djbmp1ZnpscW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDI0NjgsImV4cCI6MjEwMDI3ODQ2OH0.NO2S2_prs-Z4ES2RPhPJrU4_HhUWes_p8W6-Wb1ozGU";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json" };

function loadLocal() {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveLocal(d) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { console.error(e); }
}
async function loadCloud() {
  try {
    const r = await fetch(SB_URL + "/rest/v1/pahometr_data?id=eq.rin&select=data", { headers: SB_HEADERS });
    if (!r.ok) return null;
    const rows = await r.json();
    if (rows && rows.length > 0 && rows[0].data && rows[0].data.tasks) return rows[0].data;
    return null;
  } catch (e) { console.error("cloud load:", e); return null; }
}
async function saveCloud(d) {
  try {
    await fetch(SB_URL + "/rest/v1/pahometr_data?id=eq.rin", {
      method: "PATCH",
      headers: { ...SB_HEADERS, "Prefer": "return=minimal" },
      body: JSON.stringify({ data: d, updated_at: new Date().toISOString() })
    });
  } catch (e) { console.error("cloud save:", e); }
}
async function load() {
  const cloud = await loadCloud();
  if (cloud) { saveLocal(cloud); return cloud; }
  return loadLocal();
}
async function save(d) { saveLocal(d); saveCloud(d); }

/* ── Время ── */
const MIN = 60000;
function taskMs(t, now) {
  return (t.sessions || []).reduce((s, x) => s + (x.manualMin ? x.manualMin * MIN : (x.endedAt ?? now) - x.startedAt), 0);
}
function fmtMs(ms) {
  const m = Math.floor(ms / MIN);
  if (m < 60) return m + "м";
  const h = Math.floor(m / 60), r = m % 60;
  return r ? h + "ч " + r + "м" : h + "ч";
}
function fmtH(ms, digits = 1) {
  const h = ms / 3600000;
  return (Math.round(h * 10 ** digits) / 10 ** digits).toString().replace(".", ",");
}
const DAY_START = 5; // граница «суток»: до 5 утра — это ещё вчерашний рабочий день
function startOfDay(d) { const x = new Date(d); x.setHours(DAY_START, 0, 0, 0); if (x > d) x.setDate(x.getDate() - 1); return x; }
function startOfWeek(d) { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
function startOfMonth(d) { const x = startOfDay(d); x.setDate(1); return x; }
function overlap(s1, e1, s2, e2) { return Math.max(0, Math.min(e1, e2) - Math.max(s1, s2)); }
function msInRange(tasks, from, to, now) {
  let sum = 0;
  for (const t of tasks) for (const s of t.sessions || []) {
    if (s.manualMin) { if (s.startedAt >= from && s.startedAt <= to) sum += s.manualMin * MIN; }
    else sum += overlap(s.startedAt, s.endedAt ?? now, from, to);
  }
  return sum;
}
function msInRangeByKind(tasks, from, to, now) {
  const res = {};
  KINDS.forEach(k => res[k.id] = 0);
  for (const t of tasks) {
    const kid = res[t.kind] !== undefined ? t.kind : "task";
    for (const s of t.sessions || []) {
      if (s.manualMin) { if (s.startedAt >= from && s.startedAt <= to) res[kid] += s.manualMin * MIN; }
      else res[kid] += overlap(s.startedAt, s.endedAt ?? now, from, to);
    }
  }
  return res;
}
const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

/* ── Метр-река ── */
function River({ value, max, mark, color, height = 22 }) {
  const pct = Math.min((value / max) * 100, 100);
  const markPct = (mark / max) * 100;
  return (
    <div style={{ position: "relative", height, borderRadius: height / 2, background: "linear-gradient(180deg,#EAF6F3,#F6FBF9)", overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(51,72,74,.08)" }}>
      <div style={{ position: "absolute", inset: 0, width: pct + "%", borderRadius: height / 2, background: `linear-gradient(90deg, ${C.lagoon}, ${color})`, transition: "width .6s cubic-bezier(.4,0,.2,1)", opacity: .9 }} />
      <div style={{ position: "absolute", left: `calc(${markPct}% - 1px)`, top: 2, bottom: 2, width: 2, borderRadius: 2, background: "rgba(51,72,74,.35)" }} title="ориентир" />
      <div style={{ position: "absolute", left: `calc(${markPct}% - 4px)`, top: -3, width: 8, height: 8, borderRadius: "50%", background: C.ink, opacity: .5 }} />
    </div>
  );
}

/* ── Дельта план/факт ── */
function deltaInfo(factMs, estMin) {
  if (!estMin) return null;
  const d = (factMs / MIN - estMin) / estMin;
  const pct = Math.round(d * 100);
  let color = C.mint;
  if (pct > 25) color = C.coral; else if (pct > 10) color = C.gold;
  return { pct, color, sign: pct > 0 ? "+" : "" };
}

/* ── Приложение ── */
export default function Home() {
  const [data, setData] = useState({ projects: [], tasks: [] });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("board");
  const [filter, setFilter] = useState(null);
  const [modal, setModal] = useState(null);
  const [adding, setAdding] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newProj, setNewProj] = useState("");
  const [showProjInput, setShowProjInput] = useState(false);
  const [period, setPeriod] = useState("day");
  const [now, setNow] = useState(Date.now());
  const [drag, setDrag] = useState(null);
  const [manualMin, setManualMin] = useState("");
  const [manualH, setManualH] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [estInput, setEstInput] = useState("");
  const [projMgr, setProjMgr] = useState(false);
  const [colorPick, setColorPick] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const dragOverCol = useRef(null);

  useEffect(() => {
    load().then(d => { if (d) setData(d); setReady(true); });
  }, []);

  const active = data.tasks.find(t => (t.sessions || []).some(s => s.endedAt == null));
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const commit = useCallback((next) => { setData(next); save(next); }, []);

  /* ── операции ── */
  const addProject = (name) => {
    const nm = name.trim(); if (!nm) return;
    const p = { id: "p" + Date.now(), name: nm, color: PROJ_COLORS[data.projects.length % PROJ_COLORS.length] };
    commit({ ...data, projects: [...data.projects, p] });
    setNewProj(""); setShowProjInput(false);
  };
  const patchProject = (id, patch) => {
    commit({ ...data, projects: data.projects.map(p => p.id === id ? { ...p, ...patch } : p) });
  };
  const archiveProject = (id, arch) => {
    patchProject(id, { archived: arch });
    if (arch && filter === id) setFilter(null);
    setColorPick(null); setConfirmDel(null);
  };
  const deleteProject = (id) => {
    commit({
      ...data,
      projects: data.projects.filter(p => p.id !== id),
      tasks: data.tasks.map(t => t.projectId === id ? { ...t, projectId: null } : t)
    });
    if (filter === id) setFilter(null);
    setConfirmDel(null);
  };
  const addTask = (status) => {
    const ttl = newTitle.trim(); if (!ttl) return;
    const t = { id: "t" + Date.now(), title: ttl, projectId: filter || null, status, kind: "task", estimateMin: 0, createdAt: Date.now(), sessions: [] };
    commit({ ...data, tasks: [...data.tasks, t] });
    setNewTitle("");
  };
  const patchTask = (id, patch) => {
    commit({ ...data, tasks: data.tasks.map(t => t.id === id ? { ...t, ...patch } : t) });
  };
  const removeTask = (id) => {
    commit({ ...data, tasks: data.tasks.filter(t => t.id !== id) });
    setModal(null);
  };
  const stopAll = (tasks, ts) => tasks.map(t => ({
    ...t, sessions: (t.sessions || []).map(s => s.endedAt == null ? { ...s, endedAt: ts } : s)
  }));
  const toggleTimer = (id) => {
    const ts = Date.now();
    const t = data.tasks.find(x => x.id === id);
    const isRunning = (t.sessions || []).some(s => s.endedAt == null);
    let tasks = stopAll(data.tasks, ts);
    if (!isRunning) {
      tasks = tasks.map(x => x.id === id ? {
        ...x,
        status: x.status === "done" ? "wip" : x.status,
        sessions: [...(x.sessions || []), { id: "s" + ts, startedAt: ts, endedAt: null }]
      } : x);
    }
    commit({ ...data, tasks });
    setNow(ts);
  };
  const addManual = (id, minutes) => {
    const m = Math.round(minutes);
    if (!m || m <= 0) return;
    const ts = Date.now();
    let at = ts;
    if (manualDate === "yesterday") {
      at = startOfDay(new Date(ts)).getTime() - 86400000 + 7 * 3600000;
    } else if (manualDate) {
      const parts = manualDate.split("-").map(Number);
      at = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime();
    }
    patchTask(id, {
      sessions: [...(data.tasks.find(t => t.id === id).sessions || []), { id: "s" + ts, startedAt: at, endedAt: at, manualMin: m }]
    });
    setManualMin(""); setManualH("");
    setNow(ts);
  };
  const dropSession = (taskId, sid) => {
    const t = data.tasks.find(x => x.id === taskId);
    patchTask(taskId, { sessions: (t.sessions || []).filter(s => s.id !== sid) });
  };

  /* ── агрегаты ── */
  const visible = filter ? data.tasks.filter(t => t.projectId === filter) : data.tasks;
  const wipCount = data.tasks.filter(t => t.status === "wip").length;
  const wipVerd = verdict(WIP_V, wipCount);
  const nowD = new Date(now);
  const dayFrom = startOfDay(nowD).getTime();
  const weekFrom = startOfWeek(nowD).getTime();
  const monthFrom = startOfMonth(nowD).getTime();
  const dayMs = msInRange(data.tasks, dayFrom, now, now);
  const dayH = dayMs / 3600000;
  const dayVerd = verdictHours(DAY_V, dayH);

  const estOpen = data.tasks.filter(t => t.status !== "done").reduce((s, t) => s + (t.estimateMin || 0), 0);
  const withEst = data.tasks.filter(t => t.estimateMin > 0 && taskMs(t, now) > 0);
  const planSum = withEst.reduce((s, t) => s + t.estimateMin, 0);
  const factSum = withEst.reduce((s, t) => s + taskMs(t, now) / MIN, 0);
  const accPct = planSum ? Math.round(((factSum - planSum) / planSum) * 100) : 0;
  const accText = !withEst.length ? null : accPct > 15 ? "переоцениваешь себя" : accPct < -15 ? "закладываешь с запасом" : "оценки точные";

  /* история */
  let histMs = 0, histTable = DAY_V, histMax = 13, histMark = 4, bars = [];
  if (period === "day") {
    histMs = dayMs; histTable = DAY_V; histMax = 13; histMark = 4;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dayFrom); d.setDate(d.getDate() - i);
      const f = d.getTime(), e = f + 86400000;
      bars.push({ label: WD[(d.getDay() + 6) % 7], ms: msInRange(data.tasks, f, Math.min(e, now), now), cur: i === 0 });
    }
  } else if (period === "week") {
    histMs = msInRange(data.tasks, weekFrom, now, now); histTable = WEEK_V; histMax = 65; histMark = 20;
    for (let i = 0; i < 7; i++) {
      const f = weekFrom + i * 86400000, e = f + 86400000;
      bars.push({ label: WD[i], ms: f > now ? 0 : msInRange(data.tasks, f, Math.min(e, now), now), cur: now >= f && now < e });
    }
  } else {
    histMs = msInRange(data.tasks, monthFrom, now, now); histTable = MONTH_V; histMax = 280; histMark = 85;
    let f = startOfWeek(new Date(monthFrom)).getTime(); let wi = 1;
    const monthEnd = startOfMonth(new Date(new Date(monthFrom).setMonth(new Date(monthFrom).getMonth() + 1))).getTime();
    while (f < monthEnd) {
      const e = f + 7 * 86400000;
      bars.push({ label: "н" + wi, ms: f > now ? 0 : msInRange(data.tasks, Math.max(f, monthFrom), Math.min(e, now, monthEnd), now), cur: now >= f && now < e });
      f = e; wi++;
    }
  }
  const histH = histMs / 3600000;
  const histVerd = verdictHours(histTable, histH);
  const maxBar = Math.max(...bars.map(b => b.ms), 3600000);

  const modalTask = modal ? data.tasks.find(t => t.id === modal) : null;
  const projOf = (id) => data.projects.find(p => p.id === id);

  useEffect(() => {
    if (modalTask) setEstInput(modalTask.estimateMin ? String(modalTask.estimateMin / 60) : "");
    setManualDate(""); setManualMin(""); setManualH("");
  }, [modal]);

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, background: `linear-gradient(165deg, ${C.lagoon}, ${C.cream} 48%, ${C.peach})`, fontFamily: "'Nunito', sans-serif", color: C.mist }}>
      <div style={{ fontSize: 40 }}>🌊</div>
      <div style={{ letterSpacing: 3, fontSize: 12 }}>ЗАГРУЗКА…</div>
    </div>
  );

  const btn = { border: "none", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontWeight: 700 };
  const chip = (on, color) => ({
    ...btn, padding: "5px 13px", borderRadius: 999, fontSize: 12.5,
    background: on ? color : "#fff", color: on ? "#fff" : C.ink,
    boxShadow: on ? "none" : "0 1px 4px rgba(51,72,74,.10)", transition: "all .2s",
  });
  const card = { background: C.card, borderRadius: 18, boxShadow: "0 2px 14px rgba(180,140,100,.13)", padding: 16 };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(165deg, ${C.lagoon} 0%, ${C.cream} 48%, ${C.peach} 100%)`, backgroundAttachment: "fixed", fontFamily: "'Nunito', -apple-system, sans-serif", color: C.ink, paddingBottom: 60 }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, button { outline: none; }
        input::placeholder { color: ${C.faint}; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,.45);} 50% { box-shadow: 0 0 0 9px rgba(245,166,35,0);} }
        @keyframes rise { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: none;} }
        .rise { animation: rise .3s ease; }
        @media (prefers-reduced-motion: reduce) { .rise { animation: none; } }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.faint}; border-radius: 3px; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 16px 0" }}>

        {/* ── Шапка: сигнатура ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 14, letterSpacing: 4, color: C.mist, textTransform: "uppercase" }}>Пахометр</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums", fontSize: 52, fontWeight: 700, lineHeight: 1, color: dayVerd.color }}>{fmtH(dayMs)}</span>
              <span style={{ fontSize: 15, color: C.mist, fontWeight: 700 }}>ч сегодня</span>
            </div>
            <div style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 19, color: dayVerd.color, marginTop: 4 }}>{dayVerd.label}</div>
          </div>
          <div style={{ flex: "1 1 260px", minWidth: 240, maxWidth: 460 }}>
            <River value={dayH} max={13} mark={4} color={dayVerd.color} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mist, marginTop: 5, fontFamily: "'JetBrains Mono', monospace" }}>
              <span>0</span><span style={{ marginLeft: "18%" }}>4ч · ориентир</span><span>13ч</span>
            </div>
          </div>
        </div>

        {/* ── Табы ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["board", "Доска"], ["nowp", "Сейчас"], ["hist", "Пахометр"]].map(([id, lb]) => (
            <button key={id} onClick={() => setTab(id)} style={{ ...btn, padding: "8px 20px", borderRadius: 999, fontSize: 14, background: tab === id ? C.ink : "rgba(255,255,255,.75)", color: tab === id ? "#fff" : C.ink, boxShadow: "0 1px 6px rgba(51,72,74,.10)", transition: "all .2s" }}>{lb}</button>
          ))}
          {active && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.85)", borderRadius: 999, padding: "6px 14px", boxShadow: "0 1px 6px rgba(51,72,74,.10)" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.gold, animation: "pulse 1.6s infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 700, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.title}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: C.goldDeep }}>
                {fmtMs((active.sessions.find(s => s.endedAt == null) ? now - active.sessions.find(s => s.endedAt == null).startedAt : 0))}
              </span>
              <button onClick={() => toggleTimer(active.id)} style={{ ...btn, background: C.gold, color: "#fff", borderRadius: 999, padding: "3px 12px", fontSize: 12 }}>стоп</button>
            </div>
          )}
        </div>

        {/* ═══ ДОСКА ═══ */}
        {tab === "board" && <div className="rise">
          {/* проекты */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => setFilter(null)} style={chip(!filter, C.ink)}>Все</button>
            {data.projects.filter(p => !p.archived).map(p => (
              <button key={p.id} onClick={() => setFilter(filter === p.id ? null : p.id)} style={chip(filter === p.id, p.color)}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: filter === p.id ? "#fff" : p.color, marginRight: 6 }} />{p.name}
              </button>
            ))}
            {showProjInput ? (
              <input autoFocus value={newProj} onChange={e => setNewProj(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addProject(newProj); if (e.key === "Escape") setShowProjInput(false); }}
                onBlur={() => newProj.trim() ? addProject(newProj) : setShowProjInput(false)}
                placeholder="название проекта" style={{ border: "none", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontFamily: "'Nunito', sans-serif", boxShadow: "0 1px 6px rgba(51,72,74,.12)", width: 160 }} />
            ) : (
              <button onClick={() => setShowProjInput(true)} style={{ ...chip(false, C.ink), color: C.mist }}>+ проект</button>
            )}
            <button onClick={() => { setProjMgr(true); setColorPick(null); setConfirmDel(null); }} style={{ ...chip(false, C.ink), color: C.mist, padding: "5px 11px" }} title="настройки проектов">⚙</button>
          </div>

          {/* колонки */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 12 }}>
            {COLS.map(col => {
              const items = visible.filter(t => t.status === col.id);
              return (
                <div key={col.id}
                  onDragOver={e => { e.preventDefault(); dragOverCol.current = col.id; }}
                  onDrop={() => { if (drag) { patchTask(drag, { status: col.id }); setDrag(null); } }}
                  style={{ background: "rgba(255,255,255,.55)", borderRadius: 20, padding: 10, minHeight: 140, backdropFilter: "blur(4px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px 10px" }}>
                    <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 13.5 }}>{col.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.mist }}>{items.length}</span>
                  </div>

                  {items.map(t => {
                    const ms = taskMs(t, now);
                    const running = (t.sessions || []).some(s => s.endedAt == null);
                    const p = projOf(t.projectId);
                    const di = deltaInfo(ms, t.estimateMin);
                    const prog = t.estimateMin ? Math.min(ms / MIN / t.estimateMin, 1.6) : 0;
                    return (
                      <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)}
                        onClick={() => setModal(t.id)}
                        style={{ ...card, padding: "11px 13px", marginBottom: 8, cursor: "pointer", animation: running ? "pulse 1.8s infinite" : "none", border: running ? `1.5px solid ${C.gold}` : "1.5px solid transparent" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{t.title}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
                              {p && <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>● {p.name}</span>}
                              <span style={{ fontSize: 10, opacity: .8 }} title={(KINDS.find(k => k.id === (t.kind || "task")) || KINDS[1]).name}>{(KINDS.find(k => k.id === (t.kind || "task")) || KINDS[1]).icon}</span>
                              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: C.mist }}>{ms ? fmtMs(ms) : "—"}</span>
                              {di && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: di.color, borderRadius: 999, padding: "1px 7px" }}>{di.sign}{di.pct}%</span>}
                            </div>
                          </div>
                          <button onClick={e => { e.stopPropagation(); toggleTimer(t.id); }}
                            style={{ ...btn, width: 32, height: 32, borderRadius: "50%", flexShrink: 0, fontSize: 13, background: running ? C.gold : C.well, color: running ? "#fff" : C.mint }}>
                            {running ? "■" : "▶"}
                          </button>
                        </div>
                        {t.estimateMin > 0 && (
                          <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: C.well, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: Math.min(prog * 100, 100) + "%", background: prog <= 1 ? C.mint : (di?.color || C.gold), transition: "width .4s" }} />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {items.length === 0 && <div style={{ textAlign: "center", padding: "18px 6px", color: C.faint, fontSize: 12.5 }}>пусто — и хорошо</div>}

                  {adding === col.id ? (
                    <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addTask(col.id); if (e.key === "Escape") { setAdding(null); setNewTitle(""); } }}
                      onBlur={() => { if (newTitle.trim()) addTask(col.id); setAdding(null); }}
                      placeholder="что сделать?" style={{ width: "100%", border: "none", borderRadius: 12, padding: "9px 12px", fontSize: 13.5, fontFamily: "'Nunito', sans-serif", boxShadow: "0 1px 6px rgba(51,72,74,.12)" }} />
                  ) : (
                    <button onClick={() => { setAdding(col.id); setNewTitle(""); }} style={{ ...btn, width: "100%", padding: "8px", borderRadius: 12, background: "transparent", color: C.mist, fontSize: 13 }}>+ задача</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>}

        {/* ═══ СЕЙЧАС ═══ */}
        {tab === "nowp" && <div className="rise" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 14 }}>
          <div style={{ ...card, gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>В работе сейчас</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 46, fontWeight: 700, color: wipVerd.color, lineHeight: 1 }}>{wipCount}</span>
              <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 18, color: wipVerd.color }}>{wipVerd.label}</span>
            </div>
            <div style={{ marginTop: 12 }}><River value={wipCount} max={8} mark={3} color={wipVerd.color} height={16} /></div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>По статусам</div>
            {[["backlog", "бэклог"], ["review", "на проверке"], ["done", "готово"]].map(([s, lb]) => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
                <span style={{ color: C.mist }}>{lb}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{data.tasks.filter(t => t.status === s).length}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Висит по оценке</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 34, fontWeight: 700 }}>{(estOpen / 60).toString().replace(".", ",")}</span>
              <span style={{ color: C.mist, fontWeight: 700 }}>ч на не-готовых задачах</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.faint, marginTop: 6 }}>сумма оценок всего, что ещё не в «Готово»</div>
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>Точность оценок</div>
            {accText ? (<>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700 }}>{Math.round(planSum / 60 * 10) / 10}ч → {Math.round(factSum / 60 * 10) / 10}ч</span>
                <span style={{ fontWeight: 800, color: accPct > 15 ? C.coral : accPct < -15 ? C.mint : C.mint }}>{accPct > 0 ? "+" : ""}{accPct}%</span>
              </div>
              <div style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, marginTop: 6, color: accPct > 15 ? C.coral : C.mint }}>{accText}</div>
            </>) : <div style={{ color: C.faint, fontSize: 13.5 }}>появится, когда будут задачи с оценкой и временем</div>}
          </div>
        </div>}

        {/* ═══ ПАХОМЕТР (история) ═══ */}
        {tab === "hist" && <div className="rise">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["day", "День"], ["week", "Неделя"], ["month", "Месяц"]].map(([id, lb]) => (
              <button key={id} onClick={() => setPeriod(id)} style={chip(period === id, C.ink)}>{lb}</button>
            ))}
          </div>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 46, fontWeight: 700, color: histVerd.color, lineHeight: 1 }}>{fmtH(histMs)}</span>
              <span style={{ fontWeight: 700, color: C.mist }}>ч за {period === "day" ? "сегодня" : period === "week" ? "неделю" : "месяц"}</span>
              <span style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 19, color: histVerd.color }}>{histVerd.label}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <River value={histH} max={histMax} mark={histMark} color={histVerd.color} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mist, marginTop: 5, fontFamily: "'JetBrains Mono', monospace" }}>
                <span>0</span><span>{histMark}ч · ориентир</span><span>{histMax}ч</span>
              </div>
            </div>
            {histMs > 0 && (() => {
              const histFrom = period === "day" ? dayFrom : period === "week" ? weekFrom : monthFrom;
              const byKind = msInRangeByKind(data.tasks, histFrom, now, now);
              return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", background: C.well }}>
                    {KINDS.map(k => byKind[k.id] > 0 && (
                      <div key={k.id} style={{ width: (byKind[k.id] / histMs * 100) + "%", background: k.color, opacity: .85, transition: "width .4s" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8 }}>
                    {KINDS.map(k => byKind[k.id] > 0 && (
                      <span key={k.id} style={{ fontSize: 12, color: C.ink, fontWeight: 700 }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: k.color, marginRight: 5 }} />
                        {k.icon} {k.name} · <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtH(byKind[k.id])}ч</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, letterSpacing: 2, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 14 }}>
              {period === "month" ? "по неделям" : "по дням"}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 130 }}>
              {bars.map((b, i) => {
                const h = Math.max((b.ms / maxBar) * 100, b.ms > 0 ? 4 : 2);
                const bh = b.ms / 3600000;
                const v = verdictHours(period === "month" ? WEEK_V : DAY_V, bh);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: C.mist }}>{b.ms ? fmtH(b.ms) : ""}</span>
                    <div style={{ width: "100%", maxWidth: 44, height: h + "%", borderRadius: 8, background: b.ms ? `linear-gradient(180deg, ${v.color}, ${C.lagoon})` : C.well, outline: b.cur ? `2px solid ${C.ink}` : "none", outlineOffset: 2, transition: "height .4s" }} />
                    <span style={{ fontSize: 11.5, fontWeight: b.cur ? 800 : 600, color: b.cur ? C.ink : C.mist }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>}
      </div>

      {/* ═══ Модалка проектов ═══ */}
      {projMgr && (
        <div onClick={() => setProjMgr(false)} style={{ position: "fixed", inset: 0, background: "rgba(51,72,74,.35)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 }}>
          <div onClick={e => e.stopPropagation()} className="rise" style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 20, boxShadow: "0 -8px 40px rgba(51,72,74,.25)" }}>
            <div style={{ fontFamily: "'Comfortaa', cursive", fontWeight: 700, fontSize: 17, marginBottom: 14 }}>Проекты</div>

            {data.projects.filter(p => !p.archived).length === 0 && (
              <div style={{ color: C.faint, fontSize: 13.5, marginBottom: 12 }}>активных проектов нет</div>
            )}
            {data.projects.filter(p => !p.archived).map(p => (
              <div key={p.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "10px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => { setColorPick(colorPick === p.id ? null : p.id); setConfirmDel(null); }} style={{ ...btn, width: 22, height: 22, borderRadius: "50%", background: p.color, flexShrink: 0, border: colorPick === p.id ? `2px solid ${C.ink}` : "2px solid transparent" }} title="цвет" />
                  <input key={p.id + p.name} defaultValue={p.name}
                    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.name) patchProject(p.id, { name: v }); }}
                    style={{ flex: 1, minWidth: 0, border: "none", background: C.well, borderRadius: 10, padding: "7px 11px", fontSize: 14, fontWeight: 700, fontFamily: "'Nunito', sans-serif", color: C.ink }} />
                  <button onClick={() => archiveProject(p.id, true)} style={{ ...btn, background: C.well, color: C.mist, borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>в архив</button>
                  {confirmDel === p.id ? (
                    <button onClick={() => deleteProject(p.id)} style={{ ...btn, background: C.coral, color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>точно?</button>
                  ) : (
                    <button onClick={() => { setConfirmDel(p.id); setColorPick(null); }} style={{ ...btn, background: "none", color: C.faint, fontSize: 16 }}>×</button>
                  )}
                </div>
                {colorPick === p.id && (
                  <div className="rise" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {PROJ_COLORS.map(c => (
                      <button key={c} onClick={() => { patchProject(p.id, { color: c }); setColorPick(null); }} style={{ ...btn, width: 26, height: 26, borderRadius: "50%", background: c, border: p.color === c ? `2.5px solid ${C.ink}` : "2.5px solid #fff", boxShadow: "0 1px 4px rgba(51,72,74,.18)" }} />
                    ))}
                  </div>
                )}
                {confirmDel === p.id && (
                  <div style={{ fontSize: 11.5, color: C.coral, marginTop: 6 }}>задачи проекта останутся — станут «без проекта»</div>
                )}
              </div>
            ))}

            {data.projects.some(p => p.archived) && (<>
              <div style={{ fontSize: 12, letterSpacing: 1.5, color: C.mist, fontWeight: 800, textTransform: "uppercase", margin: "16px 0 4px" }}>Архив</div>
              {data.projects.filter(p => p.archived).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.line}`, padding: "9px 0" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, opacity: .5, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.mist, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <button onClick={() => archiveProject(p.id, false)} style={{ ...btn, background: C.well, color: C.mint, borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>вернуть</button>
                  {confirmDel === p.id ? (
                    <button onClick={() => deleteProject(p.id)} style={{ ...btn, background: C.coral, color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>точно?</button>
                  ) : (
                    <button onClick={() => setConfirmDel(p.id)} style={{ ...btn, background: "none", color: C.faint, fontSize: 16 }}>×</button>
                  )}
                </div>
              ))}
            </>)}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setProjMgr(false)} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: 999, padding: "8px 22px", fontSize: 14 }}>готово</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Модалка задачи ═══ */}
      {modalTask && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(51,72,74,.35)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 }}>
          <div onClick={e => e.stopPropagation()} className="rise" style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 20, boxShadow: "0 -8px 40px rgba(51,72,74,.25)" }}>
            <input value={modalTask.title} onChange={e => patchTask(modalTask.id, { title: e.target.value })}
              style={{ width: "100%", border: "none", fontSize: 19, fontWeight: 800, fontFamily: "'Nunito', sans-serif", color: C.ink, marginBottom: 14 }} />

            {/* проект + статус */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <button onClick={() => patchTask(modalTask.id, { projectId: null })} style={chip(!modalTask.projectId, C.ink)}>без проекта</button>
              {data.projects.filter(p => !p.archived || p.id === modalTask.projectId).map(p => (
                <button key={p.id} onClick={() => patchTask(modalTask.id, { projectId: p.id })} style={chip(modalTask.projectId === p.id, p.color)}>{p.name}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {COLS.map(c => (
                <button key={c.id} onClick={() => patchTask(modalTask.id, { status: c.id })} style={chip(modalTask.status === c.id, C.mint)}>{c.name}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {KINDS.map(k => (
                <button key={k.id} onClick={() => patchTask(modalTask.id, { kind: k.id })} style={chip((modalTask.kind || "task") === k.id, k.color)}>{k.icon} {k.name}</button>
              ))}
            </div>

            {/* таймер + факт/план */}
            <div style={{ background: C.well, borderRadius: 16, padding: 14, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700 }}>{fmtMs(taskMs(modalTask, now))}</div>
                  {modalTask.estimateMin > 0 && (() => { const di = deltaInfo(taskMs(modalTask, now), modalTask.estimateMin); return (
                    <div style={{ fontSize: 12.5, color: C.mist, marginTop: 2 }}>план {fmtMs(modalTask.estimateMin * MIN)} · <span style={{ color: di.color, fontWeight: 800 }}>{di.sign}{di.pct}%</span></div>
                  ); })()}
                </div>
                {(() => { const running = (modalTask.sessions || []).some(s => s.endedAt == null); return (
                  <button onClick={() => toggleTimer(modalTask.id)} style={{ ...btn, borderRadius: 999, padding: "10px 24px", fontSize: 15, background: running ? C.coral : C.mint, color: "#fff" }}>
                    {running ? "стоп" : "старт"}
                  </button>
                ); })()}
              </div>
              {modalTask.estimateMin > 0 && (() => { const prog = taskMs(modalTask, now) / MIN / modalTask.estimateMin; const di = deltaInfo(taskMs(modalTask, now), modalTask.estimateMin); return (
                <div style={{ marginTop: 12, height: 8, borderRadius: 4, background: "#fff", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(prog * 100, 100) + "%", background: prog <= 1 ? C.mint : di.color, transition: "width .4s" }} />
                </div>
              ); })()}
            </div>

            {/* оценка */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>Оценка</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[0.5, 1, 2, 4, 8].map(h => (
                  <button key={h} onClick={() => patchTask(modalTask.id, { estimateMin: h * 60 })} style={chip(modalTask.estimateMin === h * 60, C.gold)}>{h}ч</button>
                ))}
                <input value={estInput} onChange={e => setEstInput(e.target.value)}
                  onBlur={() => { const v = parseFloat(estInput.replace(",", ".")); patchTask(modalTask.id, { estimateMin: v > 0 ? Math.round(v * 60) : 0 }); }}
                  placeholder="часов" inputMode="decimal"
                  style={{ width: 74, border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 13, background: C.well, fontFamily: "'JetBrains Mono', monospace" }} />
                {modalTask.estimateMin > 0 && <button onClick={() => { patchTask(modalTask.id, { estimateMin: 0 }); setEstInput(""); }} style={{ ...btn, background: "none", color: C.faint, fontSize: 12 }}>сброс</button>}
              </div>
            </div>

            {/* ручное время */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, letterSpacing: 1.5, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>Добавить время</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[15, 30, 45, 60, 120].map(m => (
                  <button key={m} onClick={() => addManual(modalTask.id, m)} style={chip(false, C.mint)}>+{m < 60 ? m + "м" : m / 60 + "ч"}</button>
                ))}
                <input value={manualH} onChange={e => setManualH(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addManual(modalTask.id, (parseFloat((manualH || "0").replace(",", ".")) || 0) * 60 + (parseInt(manualMin) || 0)); }}
                  placeholder="часов" inputMode="decimal"
                  style={{ width: 66, border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 13, background: C.well, fontFamily: "'JetBrains Mono', monospace" }} />
                <input value={manualMin} onChange={e => setManualMin(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addManual(modalTask.id, (parseFloat((manualH || "0").replace(",", ".")) || 0) * 60 + (parseInt(manualMin) || 0)); }}
                  placeholder="минут" inputMode="numeric"
                  style={{ width: 66, border: "none", borderRadius: 999, padding: "6px 12px", fontSize: 13, background: C.well, fontFamily: "'JetBrains Mono', monospace" }} />
                <button onClick={() => addManual(modalTask.id, (parseFloat((manualH || "0").replace(",", ".")) || 0) * 60 + (parseInt(manualMin) || 0))} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 12.5 }}>ок</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 11.5, color: C.mist, fontWeight: 700 }}>когда:</span>
                <button onClick={() => setManualDate("")} style={chip(manualDate === "", C.mint)}>сегодня</button>
                <button onClick={() => setManualDate("yesterday")} style={chip(manualDate === "yesterday", C.mint)}>вчера</button>
                <input type="date" value={manualDate && manualDate !== "yesterday" ? manualDate : ""} onChange={e => setManualDate(e.target.value)}
                  style={{ border: "none", background: manualDate && manualDate !== "yesterday" ? C.mint : C.well, color: manualDate && manualDate !== "yesterday" ? "#fff" : C.ink, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>

            {/* сессии */}
            {(modalTask.sessions || []).length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, letterSpacing: 1.5, color: C.mist, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>Сессии</div>
                {[...modalTask.sessions].reverse().map(s => {
                  const d = new Date(s.startedAt);
                  return (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                      <span style={{ color: C.mist }}>{d.getDate()}.{String(d.getMonth() + 1).padStart(2, "0")} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: s.endedAt == null ? C.goldDeep : C.ink }}>
                        {s.endedAt == null ? "идёт · " + fmtMs(now - s.startedAt) : s.manualMin ? fmtMs(s.manualMin * MIN) + " · вручную" : fmtMs(s.endedAt - s.startedAt)}
                      </span>
                      <button onClick={() => dropSession(modalTask.id, s.id)} style={{ ...btn, background: "none", color: C.faint, fontSize: 15 }}>×</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <button onClick={() => removeTask(modalTask.id)} style={{ ...btn, background: "none", color: C.coral, fontSize: 13 }}>удалить задачу</button>
              <button onClick={() => setModal(null)} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: 999, padding: "8px 22px", fontSize: 14 }}>готово</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 34, fontFamily: "'Comfortaa', cursive", fontSize: 12, color: "rgba(51,72,74,.4)" }}>иду к реке 🌊</div>
    </div>
  );
}
