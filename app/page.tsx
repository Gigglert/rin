"use client";
import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";

/* ── Типы данных ── */
type Session = { id: string; startedAt: number; endedAt: number | null; manualMin?: number };
type Task = {
  id: string; title: string; projectId: string | null; sprintId: string | null;
  status: string; kind: string; due: string; estimateMin: number;
  createdAt: number; sessions: Session[];
};
type Project = { id: string; name: string; color: string; archived?: boolean };
type Sprint = { id: string; name: string; start: string; end: string; color?: string; archived?: boolean };
type AppData = { projects: Project[]; tasks: Task[]; sprints: Sprint[] };
type VerdictRow = [number, string, string];
type Verdict = { label: string; color: string };
type Bar = { label: string; ms: number; kinds: Record<string, number>; cur: boolean };

/* ── Палитра «рассвет над водой» ── */
const C = {
  lagoon: "#A8E6E1", cream: "#FDF4E3", peach: "#FFD9B3",
  ink: "#33484A", mist: "#7FA09C", faint: "#A9C0BC",
  mint: "#12A278", mintSoft: "#4EC4A0",
  gold: "#F5A623", goldDeep: "#E8912D",
  coral: "#F07860", coralDeep: "#E05A45", ember: "#D64545",
  card: "#FFFFFF", line: "#E4EFEA", well: "#F2F8F5",
};
const PROJ_COLORS: string[] = ["#12A278", "#F5A623", "#F07860", "#6FAEDB", "#A98BD4", "#E48FB4", "#8FBF6B", "#D9B24A"];

/* ── Дизайн-токены: 3 радиуса, 3 высоты ── */
const R = { sm: "12px", md: "20px", lg: "28px", pill: "999px" };
const SH = {
  flat: "0 1px 2px rgba(51,72,74,.06)",
  raised: "0 6px 20px -8px rgba(51,72,74,.22), 0 1px 3px rgba(51,72,74,.06)",
  float: "0 18px 48px -16px rgba(51,72,74,.30), 0 2px 8px rgba(51,72,74,.08)",
};
const FONT = { display: "'Comfortaa', cursive", body: "'Nunito', -apple-system, sans-serif", mono: "'JetBrains Mono', monospace" };

const COLS: { id: string; name: string }[] = [
  { id: "backlog", name: "Бэклог" },
  { id: "wip", name: "В работе" },
  { id: "focus", name: "Прямщас" },
  { id: "review", name: "На проверке" },
  { id: "done", name: "Готово" },
];

const KINDS: { id: string; name: string; icon: string; color: string }[] = [
  { id: "report", name: "отчётность", icon: "📊", color: "#6FAEDB" },
  { id: "task", name: "задача", icon: "✅", color: "#12A278" },
  { id: "research", name: "исследование", icon: "🔍", color: "#A98BD4" },
  { id: "manage", name: "управление", icon: "👑", color: "#E8A93C" },
  { id: "learn", name: "обучение", icon: "🎓", color: "#E4739E" },
];
const kindOf = (id: string) => KINDS.find(k => k.id === id) ?? KINDS[1];

/* ── Вердикты ── */
const DAY_V: VerdictRow[] = [
  [0, "чисто", C.mist], [2, "лайтово", C.mintSoft], [4, "рабочий ритм", C.mint],
  [6, "плотно", C.gold], [8, "многовато", C.goldDeep], [10, "ебошилово", C.coral],
  [13, "пздц", C.coralDeep], [Infinity, "я сдохъ", C.ember],
];
const WEEK_V: VerdictRow[] = [
  [0, "чисто", C.mist], [10, "лайтово", C.mintSoft], [20, "рабочий ритм", C.mint],
  [30, "плотно", C.gold], [40, "многовато", C.goldDeep], [50, "ебошилово", C.coral],
  [65, "пздц", C.coralDeep], [Infinity, "я сдохъ", C.ember],
];
const MONTH_V: VerdictRow[] = [
  [0, "чисто", C.mist], [40, "лайтово", C.mintSoft], [85, "рабочий ритм", C.mint],
  [130, "плотно", C.gold], [170, "многовато", C.goldDeep], [215, "ебошилово", C.coral],
  [280, "пздц", C.coralDeep], [Infinity, "я сдохъ", C.ember],
];
const WIP_V: VerdictRow[] = [
  [1, "ничего в работе", C.mist], [3, "под контролем", C.mint], [4, "норм загрузка", C.mint],
  [6, "плотно", C.gold], [8, "перегруз, разгрузись", C.coral], [Infinity, "жесть, набрала слишком много", C.ember],
];
function verdict(table: VerdictRow[], val: number): Verdict {
  for (const [lim, label, color] of table) { if (val < lim || (val === 0 && lim === 0)) return { label, color }; }
  const last = table[table.length - 1]; return { label: last[1], color: last[2] };
}
/* Порог «включительно»: table[i]=[верхняя_граница, метка]. 4ч = «рабочий ритм», а не «плотно». */
function verdictHours(table: VerdictRow[], h: number): Verdict {
  if (h <= table[0][0]) return { label: table[0][1], color: table[0][2] };
  for (let i = 1; i < table.length; i++) {
    if (h <= table[i][0]) return { label: table[i][1], color: table[i][2] };
  }
  const last = table[table.length - 1]; return { label: last[1], color: last[2] };
}

/* ── Хранилище: localStorage + Supabase ── */
const KEY = "pahometr-v1";
const SB_URL = "https://zycbnenagwcnjufzlqna.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y2JuZW5hZ3djbmp1ZnpscW5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDI0NjgsImV4cCI6MjEwMDI3ODQ2OH0.NO2S2_prs-Z4ES2RPhPJrU4_HhUWes_p8W6-Wb1ozGU";
const SB_HEADERS: Record<string, string> = {
  "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Content-Type": "application/json",
};

function loadLocal(): AppData | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as AppData) : null; } catch { return null; }
}
function saveLocal(d: AppData): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { console.error(e); }
}
async function loadCloud(): Promise<AppData | null> {
  try {
    const r = await fetch(SB_URL + "/rest/v1/pahometr_data?id=eq.rin&select=data", { headers: SB_HEADERS });
    if (!r.ok) return null;
    const rows: { data?: AppData }[] = await r.json();
    if (rows && rows.length > 0 && rows[0].data && rows[0].data.tasks) return rows[0].data;
    return null;
  } catch (e) { console.error("cloud load:", e); return null; }
}
async function saveCloud(d: AppData): Promise<void> {
  try {
    await fetch(SB_URL + "/rest/v1/pahometr_data?id=eq.rin", {
      method: "PATCH",
      headers: { ...SB_HEADERS, "Prefer": "return=minimal" },
      body: JSON.stringify({ data: d, updated_at: new Date().toISOString() }),
    });
  } catch (e) { console.error("cloud save:", e); }
}
async function load(): Promise<AppData | null> {
  const cloud = await loadCloud();
  if (cloud) { saveLocal(cloud); return cloud; }
  return loadLocal();
}
function save(d: AppData): void { saveLocal(d); void saveCloud(d); }

/* ── Время ── */
const MIN = 60000;
function taskMs(t: Task, now: number): number {
  return (t.sessions || []).reduce(
    (s, x) => s + (x.manualMin ? x.manualMin * MIN : (x.endedAt ?? now) - x.startedAt), 0);
}
function fmtMs(ms: number): string {
  const m = Math.floor(ms / MIN);
  if (m < 60) return m + "м";
  const h = Math.floor(m / 60), r = m % 60;
  return r ? h + "ч " + r + "м" : h + "ч";
}
function fmtH(ms: number, digits = 1): string {
  const h = ms / 3600000;
  return (Math.round(h * 10 ** digits) / 10 ** digits).toString().replace(".", ",");
}
const DAY_START = 5; // граница «суток»: до 5 утра — ещё вчерашний рабочий день
function startOfDay(d: Date): Date {
  const x = new Date(d); x.setHours(DAY_START, 0, 0, 0);
  if (x > d) x.setDate(x.getDate() - 1);
  return x;
}
function startOfWeek(d: Date): Date {
  const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x;
}
/* Считаем месяц от исходной даты: иначе до 5 утра 1-го числа улетало в прошлый месяц. */
function startOfMonth(d: Date): Date {
  const x = new Date(d); x.setDate(1); x.setHours(DAY_START, 0, 0, 0); return x;
}
function overlap(s1: number, e1: number, s2: number, e2: number): number {
  return Math.max(0, Math.min(e1, e2) - Math.max(s1, s2));
}
/* Время ОДНОЙ задачи внутри диапазона. msInRange считает через неё же,
   поэтому сумма по карточкам всегда равна итогу за день. */
function taskMsInRange(t: Task, from: number, to: number, now: number): number {
  let sum = 0;
  for (const s of t.sessions || []) {
    if (s.manualMin) { if (s.startedAt >= from && s.startedAt <= to) sum += s.manualMin * MIN; }
    else sum += overlap(s.startedAt, s.endedAt ?? now, from, to);
  }
  return sum;
}
function msInRange(tasks: Task[], from: number, to: number, now: number): number {
  let sum = 0;
  for (const t of tasks) sum += taskMsInRange(t, from, to, now);
  return sum;
}
type DaySession = { id: string; ms: number; start: number; end: number; manual: boolean };
/* Сессии задачи, попавшие в диапазон. Время обрезается по границам дня. */
function sessionsInRange(t: Task, from: number, to: number, now: number): DaySession[] {
  const out: DaySession[] = [];
  for (const s of t.sessions || []) {
    if (s.manualMin) {
      if (s.startedAt >= from && s.startedAt <= to)
        out.push({ id: s.id, ms: s.manualMin * MIN, start: s.startedAt, end: s.startedAt, manual: true });
    } else {
      const e = s.endedAt ?? now;
      const ms = overlap(s.startedAt, e, from, to);
      if (ms > 0) out.push({ id: s.id, ms, start: Math.max(s.startedAt, from), end: Math.min(e, to), manual: false });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
function msInRangeByKind(tasks: Task[], from: number, to: number, now: number): Record<string, number> {
  const res: Record<string, number> = {};
  KINDS.forEach(k => { res[k.id] = 0; });
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
const WD_FULL = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const fmtLongDate = (ts: number): string => {
  const d = new Date(ts);
  return WD_FULL[(d.getDay() + 6) % 7] + ", " + d.getDate() + " " + MONTHS_GEN[d.getMonth()];
};
const fmtClock = (ts: number): string => {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};
const ymdOf = (d: Date): string =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

/* ── Поле-дата: нативный input с видимой рамкой, чтобы браузер рисовал его как поле ── */
const dateField: CSSProperties = {
  border: `1px solid ${C.line}`, background: "#fff", color: C.ink,
  borderRadius: R.sm, padding: "8px 10px", fontSize: 13,
  fontFamily: FONT.body, colorScheme: "light",
};

/* ── Выбор дня для ручного времени ── */
function DayPicker({ value, onChange, now }: { value: string; onChange: (v: string) => void; now: number }) {
  const base = startOfDay(new Date(now));
  const days: { ymd: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base.getTime() - i * 86400000);
    days.push({
      ymd: ymdOf(d),
      label: i === 0 ? "сегодня" : i === 1 ? "вчера" : WD[(d.getDay() + 6) % 7] + " " + d.getDate(),
    });
  }
  const todayYMD = days[0].ymd;
  const cur = value || todayYMD;
  const other = !days.some(x => x.ymd === cur);
  const dayChip = (on: boolean): CSSProperties => ({
    border: "none", cursor: "pointer", fontFamily: FONT.body, fontWeight: 700,
    padding: "7px 12px", borderRadius: R.pill, fontSize: 12.5, whiteSpace: "nowrap",
    background: on ? C.mint : "#fff", color: on ? "#fff" : C.ink,
    boxShadow: on ? SH.raised : SH.flat, transition: "all .18s",
  });
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11.5, color: C.mist, fontWeight: 700, marginBottom: 7 }}>За какой день записать</div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" } as CSSProperties}>
        {days.map(d => (
          <button key={d.ymd} onClick={() => onChange(d.ymd === todayYMD ? "" : d.ymd)} style={dayChip(cur === d.ymd)}>{d.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 9, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, color: C.faint, fontWeight: 700 }}>раньше:</span>
        <input type="date" value={other ? cur : ""} max={todayYMD}
          onChange={e => onChange(e.target.value)}
          style={other ? { ...dateField, borderColor: C.mint, boxShadow: `0 0 0 2px ${C.mint}33` } : dateField} />
        {other && (
          <button onClick={() => onChange("")}
            style={{ border: "none", cursor: "pointer", background: "none", color: C.faint, fontSize: 12, fontFamily: FONT.body, fontWeight: 700 }}>
            сбросить
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Метр-река: сигнатурный элемент ── */
function River({ value, max, mark, color, height = 26 }:
  { value: number; max: number; mark: number; color: string; height?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const markPct = Math.min((mark / max) * 100, 100);
  return (
    <div style={{
      position: "relative", height, borderRadius: R.pill,
      background: "linear-gradient(180deg,#EAF6F3,#F6FBF9)",
      overflow: "hidden", boxShadow: "inset 0 2px 5px rgba(51,72,74,.10)",
    }}>
      <div style={{
        position: "absolute", inset: 0, width: pct + "%", borderRadius: R.pill,
        background: `linear-gradient(90deg, ${C.lagoon}, ${color})`,
        transition: "width .7s cubic-bezier(.4,0,.2,1)",
      }} />
      {pct > 3 && (
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: pct + "%",
          backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,.28) 0 2px, transparent 2px 9px)",
          mixBlendMode: "soft-light", borderRadius: R.pill,
          transition: "width .7s cubic-bezier(.4,0,.2,1)",
          animation: "flow 5s linear infinite",
        }} />
      )}
      {pct > 6 && pct < 99 && (
        <div style={{
          position: "absolute", top: 2, bottom: 2, left: `calc(${pct}% - 5px)`, width: 5,
          borderRadius: R.pill, background: "rgba(255,255,255,.55)", filter: "blur(1px)",
          transition: "left .7s cubic-bezier(.4,0,.2,1)",
        }} />
      )}
      <div style={{
        position: "absolute", left: `calc(${markPct}% - 1px)`, top: 3, bottom: 3, width: 2,
        borderRadius: 2, background: "rgba(51,72,74,.28)",
      }} title="ориентир" />
      <div style={{
        position: "absolute", left: `calc(${markPct}% - 5px)`, top: -3, width: 10, height: 10,
        borderRadius: "50%", background: "#fff", border: `2px solid ${C.ink}`, opacity: .55,
        boxShadow: "0 1px 3px rgba(51,72,74,.25)",
      }} />
    </div>
  );
}

const parseYMD = (s: string | undefined): number => {
  const p = (s || "").split("-").map(Number);
  return p.length === 3 && p[0] ? new Date(p[0], p[1] - 1, p[2]).getTime() : 0;
};
const fmtDate = (ts: number): string => {
  const d = new Date(ts); return d.getDate() + "." + String(d.getMonth() + 1).padStart(2, "0");
};
function dueInfo(due: string): Verdict | null {
  const d = parseYMD(due);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today.getTime()) / 86400000);
  if (diff < 0) return { label: "🔥 " + fmtDate(d), color: C.ember };
  if (diff === 0) return { label: "⏰ сегодня", color: C.coralDeep };
  if (diff === 1) return { label: "завтра", color: C.goldDeep };
  if (diff <= 3) return { label: fmtDate(d), color: C.gold };
  return { label: fmtDate(d), color: C.mist };
}

/* ── Дельта план/факт ── */
function deltaInfo(factMs: number, estMin: number): { pct: number; color: string; sign: string } | null {
  if (!estMin) return null;
  const d = (factMs / MIN - estMin) / estMin;
  const pct = Math.round(d * 100);
  let color = C.mint;
  if (pct > 25) color = C.coral; else if (pct > 10) color = C.gold;
  return { pct, color, sign: pct > 0 ? "+" : "" };
}

/* ── Приложение ── */
export default function Home() {
  const [data, setData] = useState<AppData>({ projects: [], tasks: [], sprints: [] });
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("board");
  const [filter, setFilter] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newProj, setNewProj] = useState("");
  const [showProjInput, setShowProjInput] = useState(false);
  const [period, setPeriod] = useState("day");
  const [logDate, setLogDate] = useState("");
  const [now, setNow] = useState(Date.now());
  const [drag, setDrag] = useState<string | null>(null);
  const [manualMin, setManualMin] = useState("");
  const [manualH, setManualH] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [sprintFilter, setSprintFilter] = useState<string | null>(null);
  const [estInput, setEstInput] = useState("");
  const [projMgr, setProjMgr] = useState(false);
  const [mgrTab, setMgrTab] = useState("proj");
  const [newSprintDays, setNewSprintDays] = useState("14");
  const [lenOpen, setLenOpen] = useState<string | null>(null);
  const [lenInput, setLenInput] = useState("");
  const [colorPick, setColorPick] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const dragOverCol = useRef<string | null>(null);

  useEffect(() => {
    void load().then(d => { if (d) setData(d); setReady(true); });
  }, []);

  const active = data.tasks.find(t => (t.sessions || []).some(s => s.endedAt == null));
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const commit = useCallback((next: AppData) => { setData(next); save(next); }, []);

  /* ── операции ── */
  const addProject = (name: string) => {
    const nm = name.trim(); if (!nm) return;
    const p: Project = { id: "p" + Date.now(), name: nm, color: PROJ_COLORS[data.projects.length % PROJ_COLORS.length] };
    commit({ ...data, projects: [...data.projects, p] });
    setNewProj(""); setShowProjInput(false);
  };
  const patchProject = (id: string, patch: Partial<Project>) => {
    commit({ ...data, projects: data.projects.map(p => p.id === id ? { ...p, ...patch } : p) });
  };
  const archiveProject = (id: string, arch: boolean) => {
    patchProject(id, { archived: arch });
    if (arch && filter === id) setFilter(null);
    setColorPick(null); setConfirmDel(null);
  };
  const deleteProject = (id: string) => {
    commit({
      ...data,
      projects: data.projects.filter(p => p.id !== id),
      tasks: data.tasks.map(t => t.projectId === id ? { ...t, projectId: null } : t),
    });
    if (filter === id) setFilter(null);
    setConfirmDel(null);
  };
  const patchSprint = (id: string, patch: Partial<Sprint>) => {
    commit({ ...data, sprints: (data.sprints || []).map(s => s.id === id ? { ...s, ...patch } : s) });
  };
  const addSprint = (days: number) => {
    const n = (data.sprints || []).length + 1;
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const e0 = new Date(t0.getTime() + (days - 1) * 86400000);
    const sp: Sprint = {
      id: "sp" + Date.now(), name: "Спринт " + n, start: ymdOf(t0), end: ymdOf(e0),
      color: PROJ_COLORS[(data.sprints || []).length % PROJ_COLORS.length],
    };
    commit({ ...data, sprints: [...(data.sprints || []), sp] });
  };
  /* длина спринта в днях, включительно */
  const sprintDays = (sp: Sprint): number => {
    const s = parseYMD(sp.start), e = parseYMD(sp.end);
    if (!s || !e || e < s) return 0;
    return Math.round((e - s) / 86400000) + 1;
  };
  /* меняем длину, сдвигая конец от начала */
  const setSprintLength = (id: string, days: number) => {
    const sp = (data.sprints || []).find(x => x.id === id);
    if (!sp) return;
    const s = parseYMD(sp.start);
    if (!s || !days || days < 1) return;
    patchSprint(id, { end: ymdOf(new Date(s + (days - 1) * 86400000)) });
  };
  const archiveSprint = (id: string, arch: boolean) => {
    patchSprint(id, { archived: arch });
    if (arch && sprintFilter === id) setSprintFilter(null);
    setColorPick(null); setConfirmDel(null); setLenOpen(null);
  };
  const deleteSprint = (id: string) => {
    commit({
      ...data,
      sprints: (data.sprints || []).filter(s => s.id !== id),
      tasks: data.tasks.map(t => t.sprintId === id ? { ...t, sprintId: null } : t),
    });
    if (sprintFilter === id) setSprintFilter(null);
    setConfirmDel(null);
  };
  const addTask = (status: string) => {
    const ttl = newTitle.trim(); if (!ttl) return;
    const t: Task = {
      id: "t" + Date.now(), title: ttl, projectId: filter || null, sprintId: sprintFilter || null,
      status, kind: "task", due: "", estimateMin: 0, createdAt: Date.now(), sessions: [],
    };
    commit({ ...data, tasks: [...data.tasks, t] });
    setNewTitle("");
  };
  const patchTask = (id: string, patch: Partial<Task>) => {
    commit({ ...data, tasks: data.tasks.map(t => t.id === id ? { ...t, ...patch } : t) });
  };
  const removeTask = (id: string) => {
    commit({ ...data, tasks: data.tasks.filter(t => t.id !== id) });
    setModal(null);
  };
  const stopAll = (tasks: Task[], ts: number): Task[] => tasks.map(t => ({
    ...t, sessions: (t.sessions || []).map(s => s.endedAt == null ? { ...s, endedAt: ts } : s),
  }));
  /* Старт таймера не форсит focus: задача из «Готово» остаётся в «Готово». */
  const toggleTimer = (id: string) => {
    const ts = Date.now();
    const t = data.tasks.find(x => x.id === id);
    if (!t) return;
    const isRunning = (t.sessions || []).some(s => s.endedAt == null);
    let tasks = stopAll(data.tasks, ts);
    if (!isRunning) {
      tasks = tasks.map(x => {
        if (x.id !== id) return x;
        const nextStatus = (x.status === "backlog" || x.status === "wip") ? "focus" : x.status;
        return { ...x, status: nextStatus, sessions: [...(x.sessions || []), { id: "s" + ts, startedAt: ts, endedAt: null }] };
      });
    }
    commit({ ...data, tasks });
    setNow(ts);
  };
  const addManual = (id: string, minutes: number) => {
    const m = Math.round(minutes);
    if (!m || m <= 0) return;
    const t = data.tasks.find(x => x.id === id);
    if (!t) return;
    const ts = Date.now();
    const todayYMD = ymdOf(startOfDay(new Date(ts)));
    const target = manualDate || todayYMD;
    let at = ts;
    if (target !== todayYMD) {
      const p = target.split("-").map(Number);
      /* полдень выбранного дня — всегда внутри «рабочих суток» этой даты */
      at = new Date(p[0], p[1] - 1, p[2], 12, 0, 0).getTime();
    }
    patchTask(id, {
      sessions: [...(t.sessions || []), { id: "s" + ts, startedAt: at, endedAt: at, manualMin: m }],
    });
    setManualMin(""); setManualH("");
    setNow(ts);
  };
  const dropSession = (taskId: string, sid: string) => {
    const t = data.tasks.find(x => x.id === taskId);
    if (!t) return;
    patchTask(taskId, { sessions: (t.sessions || []).filter(s => s.id !== sid) });
  };
  const manualTotal = (): number =>
    (parseFloat((manualH || "0").replace(",", ".")) || 0) * 60 + (parseInt(manualMin) || 0);

  /* ── агрегаты ── */
  const visible = data.tasks.filter(t => (!filter || t.projectId === filter) && (!sprintFilter || t.sprintId === sprintFilter));
  const focusCount = data.tasks.filter(t => t.status === "focus").length;
  const wipOnly = data.tasks.filter(t => t.status === "wip").length;
  const inFlight = focusCount + wipOnly;
  const focusVerd = verdict(WIP_V, focusCount);
  const wipVerd = verdict(WIP_V, inFlight);
  const nowD = new Date(now);
  const dayFrom = startOfDay(nowD).getTime();
  const weekFrom = startOfWeek(nowD).getTime();
  const monthFrom = startOfMonth(nowD).getTime();
  const dayMs = msInRange(data.tasks, dayFrom, now, now);
  const dayH = dayMs / 3600000;
  const dayVerd = verdictHours(DAY_V, dayH);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

  const estOpen = data.tasks.filter(t => t.status !== "done").reduce((s, t) => s + (t.estimateMin || 0), 0);
  const withEst = data.tasks.filter(t => t.estimateMin > 0 && taskMs(t, now) > 0);
  const planSum = withEst.reduce((s, t) => s + t.estimateMin, 0);
  const factSum = withEst.reduce((s, t) => s + taskMs(t, now) / MIN, 0);
  const accPct = planSum ? Math.round(((factSum - planSum) / planSum) * 100) : 0;
  const accText = !withEst.length ? null : accPct > 15 ? "переоцениваешь себя" : accPct < -15 ? "закладываешь с запасом" : "оценки точные";

  /* история */
  let histMs = 0, histTable: VerdictRow[] = DAY_V, histMax = 13, histMark = 4;
  const bars: Bar[] = [];
  if (period === "day") {
    histMs = dayMs; histTable = DAY_V; histMax = 13; histMark = 4;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dayFrom); d.setDate(d.getDate() - i);
      const f = d.getTime(), e = f + 86400000;
      bars.push({
        label: WD[(d.getDay() + 6) % 7],
        ms: msInRange(data.tasks, f, Math.min(e, now), now),
        kinds: msInRangeByKind(data.tasks, f, Math.min(e, now), now),
        cur: i === 0,
      });
    }
  } else if (period === "week") {
    histMs = msInRange(data.tasks, weekFrom, now, now); histTable = WEEK_V; histMax = 65; histMark = 20;
    for (let i = 0; i < 7; i++) {
      const f = weekFrom + i * 86400000, e = f + 86400000;
      bars.push({
        label: WD[i],
        ms: f > now ? 0 : msInRange(data.tasks, f, Math.min(e, now), now),
        kinds: f > now ? {} : msInRangeByKind(data.tasks, f, Math.min(e, now), now),
        cur: now >= f && now < e,
      });
    }
  } else {
    histMs = msInRange(data.tasks, monthFrom, now, now); histTable = MONTH_V; histMax = 280; histMark = 85;
    let f = startOfWeek(new Date(monthFrom)).getTime(); let wi = 1;
    const monthEnd = startOfMonth(new Date(new Date(monthFrom).setMonth(new Date(monthFrom).getMonth() + 1))).getTime();
    while (f < monthEnd) {
      const e = f + 7 * 86400000;
      bars.push({
        label: "н" + wi,
        ms: f > now ? 0 : msInRange(data.tasks, Math.max(f, monthFrom), Math.min(e, now, monthEnd), now),
        kinds: f > now ? {} : msInRangeByKind(data.tasks, Math.max(f, monthFrom), Math.min(e, now, monthEnd), now),
        cur: now >= f && now < e,
      });
      f = e; wi++;
    }
  }
  const histH = histMs / 3600000;
  const histVerd = verdictHours(histTable, histH);
  const maxBar = Math.max(...bars.map(b => b.ms), 3600000);
  const kindDay = msInRangeByKind(data.tasks, dayFrom, now, now);
  const kindWeek = msInRangeByKind(data.tasks, weekFrom, now, now);
  const kindMonth = msInRangeByKind(data.tasks, monthFrom, now, now);

  /* ── «А че было?»: сутки от 05:00 выбранной даты до 05:00 следующей ── */
  const logFrom = (() => {
    if (logDate) {
      const p = logDate.split("-").map(Number);
      if (p.length === 3 && p[0]) return new Date(p[0], p[1] - 1, p[2], DAY_START, 0, 0).getTime();
    }
    return startOfDay(new Date(now)).getTime();
  })();
  const logTo = logFrom + 86400000;
  const logRows = data.tasks
    .map(t => ({ t, ms: taskMsInRange(t, logFrom, logTo, now), sess: sessionsInRange(t, logFrom, logTo, now) }))
    .filter(r => r.ms > 0)
    .sort((a, b) => b.ms - a.ms);
  const logTotal = logRows.reduce((s, r) => s + r.ms, 0);
  const logKinds = msInRangeByKind(data.tasks, logFrom, logTo, now);
  const logVerd = verdictHours(DAY_V, logTotal / 3600000);

  const modalTask = modal ? data.tasks.find(t => t.id === modal) : undefined;
  const projOf = (id: string | null) => id ? data.projects.find(p => p.id === id) : undefined;

  useEffect(() => {
    const mt = modal ? data.tasks.find(t => t.id === modal) : undefined;
    if (mt) setEstInput(mt.estimateMin ? String(mt.estimateMin / 60) : "");
    setManualDate(""); setManualMin(""); setManualH("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  if (!ready) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 14,
      background: `linear-gradient(165deg, ${C.lagoon} 0%, ${C.lagoon} 38%, ${C.cream} 74%, ${C.peach} 100%)`,
      fontFamily: FONT.body, color: C.mist,
    }}>
      <div style={{ fontSize: 46, animation: "bob 2.4s ease-in-out infinite" }}>🌊</div>
      <div style={{ letterSpacing: 4, fontSize: 12, fontWeight: 700 }}>ЗАГРУЗКА…</div>
      <style>{`@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}`}</style>
    </div>
  );

  const btn: CSSProperties = { border: "none", cursor: "pointer", fontFamily: FONT.body, fontWeight: 700 };
  const chip = (on: boolean, color: string): CSSProperties => ({
    ...btn, padding: "6px 14px", borderRadius: R.pill, fontSize: 12.5,
    background: on ? color : "#fff", color: on ? "#fff" : C.ink,
    boxShadow: on ? SH.raised : SH.flat, transition: "all .2s",
  });
  const eyebrow: CSSProperties = { fontSize: 11, letterSpacing: 2, color: C.mist, fontWeight: 800, textTransform: "uppercase" };
  const card: CSSProperties = { background: C.card, borderRadius: R.lg, boxShadow: SH.raised, padding: 20 };
  const num: CSSProperties = { fontFamily: FONT.mono, fontVariantNumeric: "tabular-nums" };
  const liveSession = active ? (active.sessions || []).find(s => s.endedAt == null) : undefined;

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(165deg, ${C.lagoon} 0%, ${C.lagoon} 38%, ${C.cream} 74%, ${C.peach} 100%)`,
      backgroundAttachment: "fixed", fontFamily: FONT.body, color: C.ink, paddingBottom: 70,
    }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, button { outline: none; }
        input::placeholder { color: ${C.faint}; }
        button:focus-visible, input:focus-visible { box-shadow: 0 0 0 3px ${C.mint}55 !important; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(245,166,35,.40);} 50% { box-shadow: 0 0 0 8px rgba(245,166,35,0);} }
        @keyframes rise { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: none;} }
        @keyframes flow { from { background-position: 0 0; } to { background-position: 90px 0; } }
        @keyframes sheet { from { transform: translateY(24px); opacity: 0;} to { transform: none; opacity: 1;} }
        .rise { animation: rise .35s ease; }
        .sheet { animation: sheet .3s cubic-bezier(.2,.8,.2,1); }
        .liftable { transition: transform .18s ease, box-shadow .18s ease; }
        .liftable:hover { transform: translateY(-3px); box-shadow: ${SH.float}; }
        @media (prefers-reduced-motion: reduce) { *, .rise, .sheet, .liftable { animation: none !important; transition: none !important; } }
        ::-webkit-scrollbar { height: 7px; width: 7px; }
        ::-webkit-scrollbar-thumb { background: ${C.faint}; border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        .board { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
        @media (min-width: 1120px) { .board { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
      `}</style>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "30px 18px 0" }}>

        {/* ── Шапка-герой: прямо на градиенте, ничем не закрыта ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, letterSpacing: 5, color: C.mist, textTransform: "uppercase" }}>Пахометр</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 6 }}>
                <span style={{ ...num, fontSize: 62, fontWeight: 700, lineHeight: .9, color: dayVerd.color, letterSpacing: -2 }}>{fmtH(dayMs)}</span>
                <span style={{ fontSize: 15, color: C.mist, fontWeight: 700 }}>часов<br />сегодня</span>
              </div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: dayVerd.color, marginTop: 8 }}>{dayVerd.label}</div>
            </div>
            {active && (
              <div className="liftable" style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.85)", borderRadius: R.md, padding: "12px 16px", boxShadow: SH.raised, color: C.ink, maxWidth: 300 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.gold, animation: "pulse 1.6s infinite", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.5, color: C.mist, fontWeight: 800, textTransform: "uppercase" }}>идёт запись</div>
                  <div style={{ fontSize: 14, fontWeight: 800, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.title}</div>
                </div>
                <span style={{ ...num, fontSize: 15, fontWeight: 800, color: C.goldDeep }}>{fmtMs(liveSession ? now - liveSession.startedAt : 0)}</span>
                <button onClick={() => toggleTimer(active.id)} style={{ ...btn, background: C.gold, color: "#fff", borderRadius: R.pill, padding: "6px 14px", fontSize: 12.5 }}>стоп</button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 18, maxWidth: 520 }}>
            <River value={dayH} max={13} mark={4} color={dayVerd.color} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mist, marginTop: 7, ...num }}>
              <span>0</span><span style={{ marginLeft: "18%" }}>4ч · ориентир дня</span><span>13ч</span>
            </div>
          </div>
        </div>

        {/* ── Табы ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {([["board", "Доска"], ["nowp", "Сейчас"], ["hist", "Пахометр"], ["log", "А че было?"]] as [string, string][]).map(([id, lb]) => (
            <button key={id} onClick={() => setTab(id)} style={{ ...btn, padding: "9px 22px", borderRadius: R.pill, fontSize: 14, background: tab === id ? C.ink : "rgba(255,255,255,.75)", color: tab === id ? "#fff" : C.ink, boxShadow: tab === id ? SH.raised : SH.flat, transition: "all .2s" }}>{lb}</button>
          ))}
        </div>

        {/* ═══ ДОСКА ═══ */}
        {tab === "board" && <div className="rise">
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <button onClick={() => setFilter(null)} style={chip(!filter, C.ink)}>Все</button>
            {data.projects.filter(p => !p.archived).map(p => (
              <button key={p.id} onClick={() => setFilter(filter === p.id ? null : p.id)} style={chip(filter === p.id, p.color)}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: filter === p.id ? "#fff" : p.color, marginRight: 6 }} />{p.name}
              </button>
            ))}
            {showProjInput ? (
              <input autoFocus value={newProj} onChange={e => setNewProj(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addProject(newProj); if (e.key === "Escape") setShowProjInput(false); }}
                onBlur={() => { if (newProj.trim()) addProject(newProj); else setShowProjInput(false); }}
                placeholder="название проекта"
                style={{ border: "none", borderRadius: R.pill, padding: "7px 14px", fontSize: 13, fontFamily: FONT.body, boxShadow: SH.raised, width: 160 }} />
            ) : (
              <button onClick={() => setShowProjInput(true)} style={{ ...chip(false, C.ink), color: C.mist }}>+ проект</button>
            )}
            <button onClick={() => { setProjMgr(true); setMgrTab("proj"); setColorPick(null); setConfirmDel(null); setLenOpen(null); }} style={{ ...chip(false, C.ink), color: C.mist, padding: "6px 12px" }} title="настройки">⚙</button>
          </div>

          {/* Спринты: строка всегда на месте, чтобы фильтр было видно и можно было создать */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            {sprintFilter && (
              <button onClick={() => setSprintFilter(null)} style={{ ...chip(false, C.ink), color: C.mist }}>× сбросить спринт</button>
            )}
            {(data.sprints || []).filter(sp => !sp.archived).map(sp => {
              const ended = parseYMD(sp.end) > 0 && parseYMD(sp.end) < todayStart;
              const on = sprintFilter === sp.id;
              return (
                <button key={sp.id} onClick={() => setSprintFilter(on ? null : sp.id)}
                  style={{ ...chip(on, sp.color || C.mint), opacity: ended && !on ? .55 : 1 }}>
                  🏃 {sp.name} <span style={{ opacity: .65, fontSize: 11 }}>{sprintDays(sp)} дн{ended ? " · закрыт" : ""}</span>
                </button>
              );
            })}
            <button onClick={() => { setProjMgr(true); setMgrTab("sprint"); setColorPick(null); setConfirmDel(null); setLenOpen(null); }}
              style={{ ...chip(false, C.ink), color: C.mist }}>+ спринт</button>
          </div>

          <div className="board">
            {COLS.map(col => {
              const items = visible.filter(t => t.status === col.id);
              return (
                <div key={col.id}
                  onDragOver={e => { e.preventDefault(); dragOverCol.current = col.id; }}
                  onDrop={() => { if (drag) { patchTask(drag, { status: col.id }); setDrag(null); } }}
                  style={{ background: "rgba(255,255,255,.42)", borderRadius: R.lg, padding: 12, minHeight: 150, backdropFilter: "blur(6px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px 12px" }}>
                    <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>{col.name}</span>
                    <span style={{ ...num, fontSize: 12, color: C.mist, background: "#fff", borderRadius: R.pill, padding: "2px 9px", boxShadow: SH.flat }}>{items.length}</span>
                  </div>

                  {items.map(t => {
                    const ms = taskMs(t, now);
                    const live = (t.sessions || []).find(s => s.endedAt == null);
                    const running = !!live;
                    const p = projOf(t.projectId);
                    const di = deltaInfo(ms, t.estimateMin);
                    const prog = t.estimateMin ? Math.min(ms / MIN / t.estimateMin, 1.6) : 0;
                    const du = dueInfo(t.due);
                    const kind = kindOf(t.kind || "task");
                    return (
                      <div key={t.id} draggable onDragStart={() => setDrag(t.id)} onDragEnd={() => setDrag(null)}
                        onClick={() => setModal(t.id)}
                        className="liftable"
                        style={{ background: C.card, borderRadius: R.md, boxShadow: running ? SH.float : SH.raised, padding: "13px 15px", marginBottom: 10, cursor: "pointer", borderLeft: `4px solid ${p ? p.color : C.line}`, position: "relative" }}>
                        {running && <span style={{ position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: "50%", background: C.gold, animation: "pulse 1.6s infinite" }} />}
                        <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3, paddingRight: running ? 16 : 0 }}>{t.title}</div>
                        <div style={{ display: "flex", gap: 9, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                          {p && <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.name}</span>}
                          <span style={{ fontSize: 11, opacity: .8 }} title={kind.name}>{kind.icon}</span>
                          <span style={{ ...num, fontSize: 11.5, color: C.mist }}>{ms ? fmtMs(ms) : "—"}</span>
                          {live && <span style={{ ...num, fontSize: 11, fontWeight: 800, color: C.goldDeep }}>⏱ {fmtMs(now - live.startedAt)}</span>}
                          {du && <span style={{ fontSize: 10.5, fontWeight: 800, color: du.color }}>{du.label}</span>}
                          {di && <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: di.color, borderRadius: R.pill, padding: "1px 8px" }}>{di.sign}{di.pct}%</span>}
                        </div>
                        {t.estimateMin > 0 && (
                          <div style={{ marginTop: 10, height: 5, borderRadius: R.pill, background: C.well, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: Math.min(prog * 100, 100) + "%", background: prog <= 1 ? C.mint : (di ? di.color : C.gold), transition: "width .4s", borderRadius: R.pill }} />
                          </div>
                        )}
                        <button onClick={e => { e.stopPropagation(); toggleTimer(t.id); }}
                          style={{ ...btn, marginTop: 10, width: "100%", padding: "7px", borderRadius: R.sm, fontSize: 12.5, background: running ? C.gold : C.well, color: running ? "#fff" : C.mint, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          {running ? "■ стоп" : "▶ старт"}
                        </button>
                      </div>
                    );
                  })}

                  {items.length === 0 && <div style={{ textAlign: "center", padding: "22px 6px", color: C.faint, fontSize: 12.5 }}>пусто — и хорошо</div>}

                  {adding === col.id ? (
                    <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") addTask(col.id); if (e.key === "Escape") { setAdding(null); setNewTitle(""); } }}
                      onBlur={() => { if (newTitle.trim()) addTask(col.id); setAdding(null); }}
                      placeholder="что сделать?"
                      style={{ width: "100%", border: "none", borderRadius: R.sm, padding: "10px 13px", fontSize: 13.5, fontFamily: FONT.body, boxShadow: SH.raised }} />
                  ) : (
                    <button onClick={() => { setAdding(col.id); setNewTitle(""); }} style={{ ...btn, width: "100%", padding: "9px", borderRadius: R.sm, background: "transparent", color: C.mist, fontSize: 13 }}>+ задача</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>}

        {/* ═══ СЕЙЧАС ═══ */}
        {tab === "nowp" && <div className="rise" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ ...card, gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", gap: 36, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ ...eyebrow, marginBottom: 8 }}>Прямщас · в фокусе</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ ...num, fontSize: 52, fontWeight: 700, color: focusVerd.color, lineHeight: 1, letterSpacing: -1 }}>{focusCount}</span>
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: focusVerd.color }}>{focusVerd.label}</span>
                </div>
              </div>
              <div>
                <div style={{ ...eyebrow, marginBottom: 8 }}>В работе · не в фокусе</div>
                <span style={{ ...num, fontSize: 52, fontWeight: 700, color: C.ink, lineHeight: 1, letterSpacing: -1 }}>{wipOnly}</span>
              </div>
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={eyebrow}>всего в полёте</span>
                <span style={{ ...num, fontSize: 26, fontWeight: 700, color: wipVerd.color }}>{inFlight}</span>
                <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 17, color: wipVerd.color }}>{wipVerd.label}</span>
              </div>
              <div style={{ marginTop: 12 }}><River value={inFlight} max={8} mark={3} color={wipVerd.color} height={18} /></div>
            </div>
          </div>

          {(data.sprints || []).filter(sp => {
            const s = parseYMD(sp.start), e = parseYMD(sp.end);
            return !sp.archived && !!s && !!e && s <= todayStart && todayStart <= e;
          }).map(sp => {
            const spFrom = parseYMD(sp.start), spTo = parseYMD(sp.end) + 86400000;
            const spTasks = data.tasks.filter(t => t.sprintId === sp.id);
            const spMs = msInRange(spTasks, spFrom, Math.min(spTo, now), now);
            const spEstAll = spTasks.reduce((s, t) => s + (t.estimateMin || 0), 0);
            const doneN = spTasks.filter(t => t.status === "done").length;
            const daysLeft = Math.max(Math.ceil((spTo - now) / 86400000), 0);
            const timePct = Math.min(Math.round((now - spFrom) / (spTo - spFrom) * 100), 100);
            const burnPct = spEstAll ? Math.round((spMs / MIN) / spEstAll * 100) : 0;
            return (
              <div key={sp.id} style={{ ...card, gridColumn: "1 / -1", borderLeft: `5px solid ${sp.color || C.mint}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: sp.color || C.ink }}>🏃 {sp.name}</span>
                  <span style={{ fontSize: 12.5, color: C.mist, fontWeight: 700 }}>{sprintDays(sp)} дн · осталось {daysLeft} · готово {doneN}/{spTasks.length}</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: C.mist, fontWeight: 700 }}>время спринта · {timePct}%</div>
                <div style={{ height: 8, borderRadius: R.pill, background: C.well, marginTop: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: timePct + "%", background: C.faint, transition: "width .4s", borderRadius: R.pill }} />
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: C.mist, fontWeight: 700 }}>
                  сожжено · <span style={{ ...num, color: C.ink }}>{fmtH(spMs)}ч</span>
                  {spEstAll > 0 && <span> из {Math.round(spEstAll / 60 * 10) / 10}ч оценок · {burnPct}%</span>}
                </div>
                {spEstAll > 0 && (
                  <div style={{ height: 8, borderRadius: R.pill, background: C.well, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.min(burnPct, 100) + "%", background: burnPct > timePct + 10 ? C.coral : C.mint, transition: "width .4s", borderRadius: R.pill }} />
                  </div>
                )}
              </div>
            );
          })}

          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>По статусам</div>
            {COLS.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.line}`, fontSize: 14 }}>
                <span style={{ color: C.mist }}>{c.name.toLowerCase()}</span>
                <span style={{ ...num, fontWeight: 700 }}>{data.tasks.filter(t => t.status === c.id).length}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 14, fontWeight: 800 }}>
              <span>всего</span>
              <span style={{ ...num, fontWeight: 800 }}>{data.tasks.length}</span>
            </div>
          </div>

          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Висит по оценке</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ ...num, fontSize: 38, fontWeight: 700, color: C.ink }}>{(estOpen / 60).toString().replace(".", ",")}</span>
              <span style={{ color: C.mist, fontWeight: 700 }}>ч на не-готовых</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.faint, marginTop: 8 }}>сумма оценок всего, что ещё не в «Готово»</div>
          </div>

          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 12 }}>Точность оценок</div>
            {accText ? (<>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span style={{ ...num, fontSize: 26, fontWeight: 700 }}>{Math.round(planSum / 60 * 10) / 10}ч → {Math.round(factSum / 60 * 10) / 10}ч</span>
                <span style={{ fontWeight: 800, color: accPct > 15 ? C.coral : C.mint }}>{accPct > 0 ? "+" : ""}{accPct}%</span>
              </div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, marginTop: 8, color: accPct > 15 ? C.coral : C.mint }}>{accText}</div>
            </>) : <div style={{ color: C.faint, fontSize: 13.5 }}>появится, когда будут задачи с оценкой и временем</div>}
          </div>
        </div>}

        {/* ═══ ПАХОМЕТР ═══ */}
        {tab === "hist" && <div className="rise">
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {([["day", "День"], ["week", "Неделя"], ["month", "Месяц"]] as [string, string][]).map(([id, lb]) => (
              <button key={id} onClick={() => setPeriod(id)} style={chip(period === id, C.ink)}>{lb}</button>
            ))}
          </div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...num, fontSize: 52, fontWeight: 700, color: histVerd.color, lineHeight: 1, letterSpacing: -1 }}>{fmtH(histMs)}</span>
              <span style={{ fontWeight: 700, color: C.mist }}>ч за {period === "day" ? "сегодня" : period === "week" ? "неделю" : "месяц"}</span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 19, color: histVerd.color }}>{histVerd.label}</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <River value={histH} max={histMax} mark={histMark} color={histVerd.color} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.mist, marginTop: 7, ...num }}>
                <span>0</span><span>{histMark}ч · ориентир</span><span>{histMax}ч</span>
              </div>
            </div>
            {histMs > 0 && (() => {
              const histFrom = period === "day" ? dayFrom : period === "week" ? weekFrom : monthFrom;
              const byKind = msInRangeByKind(data.tasks, histFrom, now, now);
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", height: 12, borderRadius: R.pill, overflow: "hidden", background: C.well }}>
                    {KINDS.filter(k => byKind[k.id] > 0).map(k => (
                      <div key={k.id} style={{ width: (byKind[k.id] / histMs * 100) + "%", background: k.color, opacity: .9, transition: "width .4s" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
                    {KINDS.filter(k => byKind[k.id] > 0).map(k => (
                      <span key={k.id} style={{ fontSize: 12, color: C.ink, fontWeight: 700 }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: k.color, marginRight: 5 }} />
                        {k.icon} {k.name} · <span style={num}>{fmtH(byKind[k.id])}ч</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...eyebrow, marginBottom: 14 }}>По типам</div>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr .7fr .7fr .7fr", gap: 9, alignItems: "center" }}>
              <span />
              <span style={{ fontSize: 10.5, color: C.faint, textAlign: "right", fontWeight: 700 }}>сегодня</span>
              <span style={{ fontSize: 10.5, color: C.faint, textAlign: "right", fontWeight: 700 }}>неделя</span>
              <span style={{ fontSize: 10.5, color: C.faint, textAlign: "right", fontWeight: 700 }}>месяц</span>
              {KINDS.map(k => (
                <div key={k.id} style={{ display: "contents" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: k.color, marginRight: 6 }} />{k.icon} {k.name}
                  </span>
                  {[kindDay, kindWeek, kindMonth].map((m, i) => (
                    <span key={i} style={{ ...num, fontSize: 13, fontWeight: 700, textAlign: "right", color: m[k.id] > 0 ? C.ink : C.faint }}>{m[k.id] > 0 ? fmtH(m[k.id]) : "—"}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{ ...eyebrow, marginBottom: 16 }}>{period === "month" ? "по неделям" : "по дням"}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 140 }}>
              {bars.map((b, i) => {
                const h = Math.max((b.ms / maxBar) * 100, b.ms > 0 ? 4 : 2);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                    <span style={{ ...num, fontSize: 10.5, color: C.mist }}>{b.ms ? fmtH(b.ms) : ""}</span>
                    <div style={{ width: "100%", maxWidth: 46, height: h + "%", borderRadius: R.sm, overflow: "hidden", display: "flex", flexDirection: "column-reverse", background: b.ms ? "transparent" : C.well, outline: b.cur ? `2px solid ${C.ink}` : "none", outlineOffset: 2, transition: "height .4s", boxShadow: b.ms ? SH.flat : "none" }}>
                      {b.ms > 0 && ["task", "report", "research", "manage", "learn"]
                        .filter(kid => (b.kinds[kid] || 0) > 0)
                        .map(kid => (
                          <div key={kid} style={{ height: (b.kinds[kid] / b.ms * 100) + "%", background: kindOf(kid).color, opacity: .9 }} />
                        ))}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: b.cur ? 800 : 600, color: b.cur ? C.ink : C.mist }}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>}

        {/* ═══ А ЧЕ БЫЛО? ═══ */}
        {tab === "log" && <div className="rise">
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ ...eyebrow, marginBottom: 4 }}>Какой день смотрим</div>
            <DayPicker value={logDate} onChange={setLogDate} now={now} />
          </div>

          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.mist, marginBottom: 10 }}>
              {fmtLongDate(logFrom)}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ ...num, fontSize: 46, fontWeight: 700, color: logVerd.color, lineHeight: 1, letterSpacing: -1 }}>{fmtH(logTotal)}</span>
              <span style={{ fontWeight: 700, color: C.mist }}>ч за день</span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, color: logVerd.color }}>{logVerd.label}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <River value={logTotal / 3600000} max={13} mark={4} color={logVerd.color} />
            </div>
            {logTotal > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", height: 12, borderRadius: R.pill, overflow: "hidden", background: C.well }}>
                  {KINDS.filter(k => logKinds[k.id] > 0).map(k => (
                    <div key={k.id} style={{ width: (logKinds[k.id] / logTotal * 100) + "%", background: k.color, opacity: .9 }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
                  {KINDS.filter(k => logKinds[k.id] > 0).map(k => (
                    <span key={k.id} style={{ fontSize: 12, color: C.ink, fontWeight: 700 }}>
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: k.color, marginRight: 5 }} />
                      {k.icon} {k.name} · <span style={num}>{fmtH(logKinds[k.id])}ч</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize: 12.5, color: C.faint, marginTop: 14 }}>
              {logRows.length === 0 ? "в этот день ничего не записано" : "задач за день: " + logRows.length}
            </div>
          </div>

          {logRows.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: "36px 20px", color: C.faint, fontSize: 13.5 }}>
              Пусто. Либо в этот день не работала, либо время не записалось — выбери другую дату выше.
            </div>
          ) : logRows.map(({ t, ms, sess }) => {
            const p = projOf(t.projectId);
            const kind = kindOf(t.kind || "task");
            const col = COLS.find(c => c.id === t.status);
            return (
              <div key={t.id} onClick={() => setModal(t.id)} className="liftable"
                style={{ ...card, padding: "16px 18px", marginBottom: 10, cursor: "pointer", borderLeft: `4px solid ${p ? p.color : C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15.5, lineHeight: 1.3 }}>{t.title}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 7, flexWrap: "wrap" }}>
                      {p && <span style={{ fontSize: 11.5, fontWeight: 700, color: p.color }}>{p.name}</span>}
                      <span style={{ fontSize: 11.5, color: C.mist }}>{kind.icon} {kind.name}</span>
                      {col && <span style={{ fontSize: 11.5, color: C.faint }}>· {col.name}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ ...num, fontSize: 25, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{fmtMs(ms)}</div>
                    <div style={{ fontSize: 10, color: C.faint, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 }}>в этот день</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                  {sess.map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                      <span style={{ ...num, color: C.mist }}>
                        {s.manual ? "добавлено вручную" : fmtClock(s.start) + "–" + fmtClock(s.end)}
                      </span>
                      <span style={{ ...num, color: C.ink, fontWeight: 700 }}>{fmtMs(s.ms)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>}
      </div>

      {/* ═══ Модалка настроек ═══ */}
      {projMgr && (
        <div onClick={() => setProjMgr(false)} style={{ position: "fixed", inset: 0, background: "rgba(51,72,74,.38)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 }}>
          <div onClick={e => e.stopPropagation()} className="sheet" style={{ background: "#fff", borderRadius: R.lg, width: "100%", maxWidth: 540, maxHeight: "88vh", overflowY: "auto", padding: 24, boxShadow: SH.float }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Настройки</div>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {([["proj", "Проекты"], ["sprint", "Спринты"]] as [string, string][]).map(([id, lb]) => (
                <button key={id} onClick={() => { setMgrTab(id); setColorPick(null); setConfirmDel(null); setLenOpen(null); }}
                  style={{ ...btn, padding: "9px 20px", borderRadius: R.pill, fontSize: 14, background: mgrTab === id ? C.ink : C.well, color: mgrTab === id ? "#fff" : C.ink, boxShadow: mgrTab === id ? SH.raised : "none" }}>{lb}</button>
              ))}
            </div>

            {mgrTab === "proj" && (<div className="rise">
              {data.projects.filter(p => !p.archived).length === 0 && (
                <div style={{ color: C.faint, fontSize: 13.5, marginBottom: 12 }}>Пока ни одного проекта. Добавь его на доске кнопкой «+ проект».</div>
              )}
              {data.projects.filter(p => !p.archived).map(p => (
                <div key={p.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "11px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => { setColorPick(colorPick === p.id ? null : p.id); setConfirmDel(null); }} style={{ ...btn, width: 24, height: 24, borderRadius: "50%", background: p.color, flexShrink: 0, border: colorPick === p.id ? `2px solid ${C.ink}` : "2px solid transparent" }} title="цвет" />
                    <input key={p.id + p.name} defaultValue={p.name}
                      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                      onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.name) patchProject(p.id, { name: v }); }}
                      style={{ flex: 1, minWidth: 0, border: "none", background: C.well, borderRadius: R.sm, padding: "8px 12px", fontSize: 14, fontWeight: 700, fontFamily: FONT.body, color: C.ink }} />
                    <button onClick={() => archiveProject(p.id, true)} style={{ ...btn, background: C.well, color: C.mist, borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>в архив</button>
                    {confirmDel === p.id ? (
                      <button onClick={() => deleteProject(p.id)} style={{ ...btn, background: C.coral, color: "#fff", borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>точно?</button>
                    ) : (
                      <button onClick={() => { setConfirmDel(p.id); setColorPick(null); }} style={{ ...btn, background: "none", color: C.faint, fontSize: 17 }} title="удалить">×</button>
                    )}
                  </div>
                  {colorPick === p.id && (
                    <div className="rise" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {PROJ_COLORS.map(c => (
                        <button key={c} onClick={() => { patchProject(p.id, { color: c }); setColorPick(null); }} style={{ ...btn, width: 28, height: 28, borderRadius: "50%", background: c, border: p.color === c ? `2.5px solid ${C.ink}` : "2.5px solid #fff", boxShadow: SH.raised }} />
                      ))}
                    </div>
                  )}
                  {confirmDel === p.id && (
                    <div style={{ fontSize: 11.5, color: C.coral, marginTop: 7 }}>Задачи проекта останутся — станут «без проекта».</div>
                  )}
                </div>
              ))}

              {data.projects.some(p => p.archived) && (<>
                <div style={{ ...eyebrow, letterSpacing: 1.5, margin: "18px 0 4px" }}>Архив</div>
                {data.projects.filter(p => p.archived).map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.line}`, padding: "10px 0" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, opacity: .5, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.mist, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <button onClick={() => archiveProject(p.id, false)} style={{ ...btn, background: C.well, color: C.mint, borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>вернуть</button>
                    {confirmDel === p.id ? (
                      <button onClick={() => deleteProject(p.id)} style={{ ...btn, background: C.coral, color: "#fff", borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>точно?</button>
                    ) : (
                      <button onClick={() => setConfirmDel(p.id)} style={{ ...btn, background: "none", color: C.faint, fontSize: 17 }} title="удалить">×</button>
                    )}
                  </div>
                ))}
              </>)}
            </div>)}

            {mgrTab === "sprint" && (<div className="rise">
              <div style={{ fontSize: 12.5, color: C.mist, marginBottom: 14, lineHeight: 1.55 }}>
                Спринт — рабочий забег с датами. Длина любая: 3 дня, 2 недели, месяц. Привяжи задачи в их карточках, фильтруй доску по 🏃, прогресс появится во вкладке «Сейчас».
              </div>

              {(data.sprints || []).filter(sp => !sp.archived).length === 0 && (
                <div style={{ color: C.faint, fontSize: 13.5, marginBottom: 14 }}>Активных спринтов нет. Создай первый ниже.</div>
              )}

              {(data.sprints || []).filter(sp => !sp.archived).map(sp => {
                const dn = sprintDays(sp);
                return (
                  <div key={sp.id} style={{ borderBottom: `1px solid ${C.line}`, padding: "12px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => { setColorPick(colorPick === sp.id ? null : sp.id); setConfirmDel(null); setLenOpen(null); }}
                        style={{ ...btn, width: 24, height: 24, borderRadius: "50%", background: sp.color || C.mint, flexShrink: 0, border: colorPick === sp.id ? `2px solid ${C.ink}` : "2px solid transparent" }} title="цвет" />
                      <input key={sp.id + sp.name} defaultValue={sp.name}
                        onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        onBlur={e => { const v = e.target.value.trim(); if (v && v !== sp.name) patchSprint(sp.id, { name: v }); }}
                        style={{ flex: "1 1 120px", minWidth: 100, border: "none", background: C.well, borderRadius: R.sm, padding: "8px 12px", fontSize: 14, fontWeight: 700, fontFamily: FONT.body, color: C.ink }} />
                      <button onClick={() => { setLenOpen(lenOpen === sp.id ? null : sp.id); setLenInput(String(dn)); setColorPick(null); setConfirmDel(null); }}
                        style={{ ...btn, background: lenOpen === sp.id ? C.ink : C.well, color: lenOpen === sp.id ? "#fff" : C.ink, borderRadius: R.pill, padding: "7px 13px", fontSize: 12.5 }}>
                        {dn} дн
                      </button>
                      <button onClick={() => archiveSprint(sp.id, true)} style={{ ...btn, background: C.well, color: C.mist, borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>в архив</button>
                      {confirmDel === sp.id ? (
                        <button onClick={() => deleteSprint(sp.id)} style={{ ...btn, background: C.coral, color: "#fff", borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>точно?</button>
                      ) : (
                        <button onClick={() => { setConfirmDel(sp.id); setColorPick(null); setLenOpen(null); }} style={{ ...btn, background: "none", color: C.faint, fontSize: 17 }} title="удалить">×</button>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11.5, color: C.mist, fontWeight: 700 }}>с</span>
                      <input type="date" value={sp.start || ""} onChange={e => patchSprint(sp.id, { start: e.target.value })} style={dateField} />
                      <span style={{ fontSize: 11.5, color: C.mist, fontWeight: 700 }}>по</span>
                      <input type="date" value={sp.end || ""} min={sp.start || undefined} onChange={e => patchSprint(sp.id, { end: e.target.value })} style={dateField} />
                    </div>

                    {lenOpen === sp.id && (
                      <div className="rise" style={{ marginTop: 12, background: C.well, borderRadius: R.md, padding: 13 }}>
                        <div style={{ fontSize: 11.5, color: C.mist, fontWeight: 700, marginBottom: 9 }}>Длина спринта — конец сдвинется от начала</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          {[3, 5, 7, 10, 14, 21, 30].map(d => (
                            <button key={d} onClick={() => { setSprintLength(sp.id, d); setLenInput(String(d)); }}
                              style={{ ...btn, padding: "6px 12px", borderRadius: R.pill, fontSize: 12.5, background: dn === d ? C.mint : "#fff", color: dn === d ? "#fff" : C.ink, boxShadow: dn === d ? SH.raised : SH.flat }}>{d}</button>
                          ))}
                          <input value={lenInput} onChange={e => setLenInput(e.target.value)} inputMode="numeric" placeholder="дней"
                            onKeyDown={e => { if (e.key === "Enter") { const v = parseInt(lenInput); if (v > 0) setSprintLength(sp.id, v); } }}
                            onBlur={() => { const v = parseInt(lenInput); if (v > 0) setSprintLength(sp.id, v); }}
                            style={{ width: 70, border: `1px solid ${C.line}`, background: "#fff", borderRadius: R.sm, padding: "7px 10px", fontSize: 13, fontFamily: FONT.mono, color: C.ink }} />
                          <button onClick={() => setLenOpen(null)} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: R.pill, padding: "7px 14px", fontSize: 12.5 }}>готово</button>
                        </div>
                      </div>
                    )}

                    {colorPick === sp.id && (
                      <div className="rise" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        {PROJ_COLORS.map(c => (
                          <button key={c} onClick={() => { patchSprint(sp.id, { color: c }); setColorPick(null); }} style={{ ...btn, width: 28, height: 28, borderRadius: "50%", background: c, border: (sp.color || C.mint) === c ? `2.5px solid ${C.ink}` : "2.5px solid #fff", boxShadow: SH.raised }} />
                        ))}
                      </div>
                    )}
                    {confirmDel === sp.id && (
                      <div style={{ fontSize: 11.5, color: C.coral, marginTop: 7 }}>Задачи спринта останутся — станут «без спринта».</div>
                    )}
                  </div>
                );
              })}

              {(data.sprints || []).some(sp => sp.archived) && (<>
                <div style={{ ...eyebrow, letterSpacing: 1.5, margin: "18px 0 4px" }}>Архив</div>
                {(data.sprints || []).filter(sp => sp.archived).map(sp => (
                  <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.line}`, padding: "10px 0", flexWrap: "wrap" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: sp.color || C.mint, opacity: .5, flexShrink: 0 }} />
                    <span style={{ flex: "1 1 120px", minWidth: 0, fontSize: 14, color: C.mist, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sp.name} · {sprintDays(sp)} дн</span>
                    <button onClick={() => archiveSprint(sp.id, false)} style={{ ...btn, background: C.well, color: C.mint, borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>вернуть</button>
                    {confirmDel === sp.id ? (
                      <button onClick={() => deleteSprint(sp.id)} style={{ ...btn, background: C.coral, color: "#fff", borderRadius: R.pill, padding: "7px 13px", fontSize: 12 }}>точно?</button>
                    ) : (
                      <button onClick={() => setConfirmDel(sp.id)} style={{ ...btn, background: "none", color: C.faint, fontSize: 17 }} title="удалить">×</button>
                    )}
                  </div>
                ))}
              </>)}

              <div style={{ marginTop: 18, background: C.well, borderRadius: R.md, padding: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 10 }}>Новый спринт</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {[3, 5, 7, 14, 21, 30].map(d => (
                    <button key={d} onClick={() => setNewSprintDays(String(d))}
                      style={{ ...btn, padding: "7px 13px", borderRadius: R.pill, fontSize: 12.5, background: newSprintDays === String(d) ? C.mint : "#fff", color: newSprintDays === String(d) ? "#fff" : C.ink, boxShadow: newSprintDays === String(d) ? SH.raised : SH.flat }}>{d} дн</button>
                  ))}
                  <input value={newSprintDays} onChange={e => setNewSprintDays(e.target.value)} inputMode="numeric" placeholder="дней"
                    style={{ width: 70, border: `1px solid ${C.line}`, background: "#fff", borderRadius: R.sm, padding: "7px 10px", fontSize: 13, fontFamily: FONT.mono, color: C.ink }} />
                </div>
                <button onClick={() => { const v = parseInt(newSprintDays); if (v > 0) addSprint(v); }}
                  style={{ ...btn, marginTop: 12, width: "100%", background: C.mint, color: "#fff", borderRadius: R.sm, padding: "10px", fontSize: 13.5, boxShadow: SH.raised }}>
                  Создать спринт с сегодня
                </button>
              </div>
            </div>)}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setProjMgr(false)} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: R.pill, padding: "9px 24px", fontSize: 14 }}>готово</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Модалка задачи ═══ */}
      {modalTask && (() => {
        const mt: Task = modalTask;
        const mtMs = taskMs(mt, now);
        const mtDi = deltaInfo(mtMs, mt.estimateMin);
        const mtRunning = (mt.sessions || []).some(s => s.endedAt == null);
        const mtDue = dueInfo(mt.due);
        const mtProg = mt.estimateMin ? mtMs / MIN / mt.estimateMin : 0;
        return (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(51,72,74,.38)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 }}>
          <div onClick={e => e.stopPropagation()} className="sheet" style={{ background: "#fff", borderRadius: R.lg, width: "100%", maxWidth: 540, maxHeight: "88vh", overflowY: "auto", padding: 24, boxShadow: SH.float }}>
            <input value={mt.title} onChange={e => patchTask(mt.id, { title: e.target.value })}
              style={{ width: "100%", border: "none", fontSize: 20, fontWeight: 800, fontFamily: FONT.body, color: C.ink, marginBottom: 16 }} />

            <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 7 }}>Проект</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              <button onClick={() => patchTask(mt.id, { projectId: null })} style={chip(!mt.projectId, C.ink)}>без проекта</button>
              {data.projects.filter(p => !p.archived || p.id === mt.projectId).map(p => (
                <button key={p.id} onClick={() => patchTask(mt.id, { projectId: p.id })} style={chip(mt.projectId === p.id, p.color)}>{p.name}</button>
              ))}
            </div>

            <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 7 }}>Статус</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {COLS.map(c => (
                <button key={c.id} onClick={() => patchTask(mt.id, { status: c.id })} style={chip(mt.status === c.id, C.mint)}>{c.name}</button>
              ))}
            </div>

            <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 7 }}>Тип работы</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {KINDS.map(k => (
                <button key={k.id} onClick={() => patchTask(mt.id, { kind: k.id })} style={chip((mt.kind || "task") === k.id, k.color)}>{k.icon} {k.name}</button>
              ))}
            </div>

            {(data.sprints || []).length > 0 && (<>
              <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 7 }}>Спринт</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                <button onClick={() => patchTask(mt.id, { sprintId: null })} style={chip(!mt.sprintId, C.ink)}>без спринта</button>
                {(data.sprints || []).filter(sp => (!sp.archived && parseYMD(sp.end) >= todayStart) || sp.id === mt.sprintId).map(sp => (
                  <button key={sp.id} onClick={() => patchTask(mt.id, { sprintId: sp.id })} style={chip(mt.sprintId === sp.id, sp.color || C.mint)}>
                    🏃 {sp.name} <span style={{ opacity: .65, fontSize: 11 }}>{sprintDays(sp)} дн</span>
                  </button>
                ))}
              </div>
            </>)}

            {/* таймер + факт/план */}
            <div style={{ background: C.well, borderRadius: R.md, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ ...num, fontSize: 30, fontWeight: 700 }}>{fmtMs(mtMs)}</div>
                  {mtDi && (
                    <div style={{ fontSize: 12.5, color: C.mist, marginTop: 3 }}>
                      план {fmtMs(mt.estimateMin * MIN)} · <span style={{ color: mtDi.color, fontWeight: 800 }}>{mtDi.sign}{mtDi.pct}%</span>
                    </div>
                  )}
                </div>
                <button onClick={() => toggleTimer(mt.id)} style={{ ...btn, borderRadius: R.pill, padding: "11px 26px", fontSize: 15, background: mtRunning ? C.coral : C.mint, color: "#fff", boxShadow: SH.raised }}>
                  {mtRunning ? "стоп" : "старт"}
                </button>
              </div>
              {mtDi && (
                <div style={{ marginTop: 12, height: 8, borderRadius: R.pill, background: "#fff", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(mtProg * 100, 100) + "%", background: mtProg <= 1 ? C.mint : mtDi.color, transition: "width .4s", borderRadius: R.pill }} />
                </div>
              )}
            </div>

            {/* оценка */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 9 }}>Оценка</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[0.5, 1, 2, 4, 8].map(h => (
                  <button key={h} onClick={() => patchTask(mt.id, { estimateMin: h * 60 })} style={chip(mt.estimateMin === h * 60, C.gold)}>{h}ч</button>
                ))}
                <input value={estInput} onChange={e => setEstInput(e.target.value)}
                  onBlur={() => { const v = parseFloat(estInput.replace(",", ".")); patchTask(mt.id, { estimateMin: v > 0 ? Math.round(v * 60) : 0 }); }}
                  placeholder="часов" inputMode="decimal"
                  style={{ width: 76, border: "none", borderRadius: R.pill, padding: "7px 13px", fontSize: 13, background: C.well, fontFamily: FONT.mono }} />
                {mt.estimateMin > 0 && <button onClick={() => { patchTask(mt.id, { estimateMin: 0 }); setEstInput(""); }} style={{ ...btn, background: "none", color: C.faint, fontSize: 12 }}>сброс</button>}
              </div>
            </div>

            {/* дедлайн */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 9 }}>Дедлайн</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input type="date" value={mt.due || ""} onChange={e => patchTask(mt.id, { due: e.target.value })} style={dateField} />
                {mtDue && <span style={{ fontSize: 12.5, fontWeight: 800, color: mtDue.color }}>{mtDue.label}</span>}
                {mt.due && <button onClick={() => patchTask(mt.id, { due: "" })} style={{ ...btn, background: "none", color: C.faint, fontSize: 12 }}>сброс</button>}
              </div>
            </div>

            {/* ручное время */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 9 }}>Добавить время</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[15, 30, 45, 60, 120].map(m => (
                  <button key={m} onClick={() => addManual(mt.id, m)} style={chip(false, C.mint)}>+{m < 60 ? m + "м" : m / 60 + "ч"}</button>
                ))}
                <input value={manualH} onChange={e => setManualH(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addManual(mt.id, manualTotal()); }}
                  placeholder="часов" inputMode="decimal"
                  style={{ width: 66, border: "none", borderRadius: R.pill, padding: "7px 13px", fontSize: 13, background: C.well, fontFamily: FONT.mono }} />
                <input value={manualMin} onChange={e => setManualMin(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addManual(mt.id, manualTotal()); }}
                  placeholder="минут" inputMode="numeric"
                  style={{ width: 66, border: "none", borderRadius: R.pill, padding: "7px 13px", fontSize: 13, background: C.well, fontFamily: FONT.mono }} />
                <button onClick={() => addManual(mt.id, manualTotal())} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: R.pill, padding: "7px 15px", fontSize: 12.5 }}>ок</button>
              </div>
              <DayPicker value={manualDate} onChange={setManualDate} now={now} />
            </div>

            {/* сессии */}
            {(mt.sessions || []).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ ...eyebrow, letterSpacing: 1.5, marginBottom: 9 }}>Сессии</div>
                {[...mt.sessions].reverse().map(s => {
                  const d = new Date(s.startedAt);
                  return (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                      <span style={{ color: C.mist }}>{d.getDate()}.{String(d.getMonth() + 1).padStart(2, "0")} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</span>
                      <span style={{ ...num, fontWeight: 700, color: s.endedAt == null ? C.goldDeep : C.ink }}>
                        {s.endedAt == null ? "идёт · " + fmtMs(now - s.startedAt) : s.manualMin ? fmtMs(s.manualMin * MIN) + " · вручную" : fmtMs(s.endedAt - s.startedAt)}
                      </span>
                      <button onClick={() => dropSession(mt.id, s.id)} style={{ ...btn, background: "none", color: C.faint, fontSize: 16 }} title="удалить сессию">×</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <button onClick={() => removeTask(mt.id)} style={{ ...btn, background: "none", color: C.coral, fontSize: 13 }}>удалить задачу</button>
              <button onClick={() => setModal(null)} style={{ ...btn, background: C.ink, color: "#fff", borderRadius: R.pill, padding: "9px 24px", fontSize: 14 }}>готово</button>
            </div>
          </div>
        </div>
        );
      })()}

      <div style={{ textAlign: "center", marginTop: 40, fontFamily: FONT.display, fontSize: 12, color: "rgba(51,72,74,.4)" }}>иду к реке 🌊</div>
    </div>
  );
}
