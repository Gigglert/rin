"use client";
import { useState, useEffect, useCallback } from "react";

const DAILY: Record<string, [number, number]> = { kcal: [1650, 1750], protein: [100, 120], fat: [50, 60], carbs: [150, 190] };
const MICROS = [
  { id: "zinc", name: "Цинк", u: "мг", d: 27.5, p: 1, c: "#a78bfa", src: "Мясо, семечки, шоколад" },
  { id: "vitD", name: "Вит D", u: "МЕ", d: 5000, p: 1, c: "#fbbf24", src: "Лосось, яйца, добавка" },
  { id: "omega3", name: "Омега-3", u: "г", d: 2, p: 1, c: "#38bdf8", src: "Лосось, скумбрия, добавка" },
  { id: "vitC", name: "Вит C", u: "мг", d: 500, p: 2, c: "#fb923c", src: "Киви 85мг/шт, гуава, добавка" },
  { id: "collagen", name: "Коллаген", u: "мг", d: 3750, p: 2, c: "#f472b6", src: "Добавка порошок/саше" },
  { id: "b6", name: "B6", u: "мг", d: 37.5, p: 3, c: "#34d399", src: "Курица, лосось, Dr.PONG" },
  { id: "b12", name: "B12", u: "мкг", d: 500, p: 3, c: "#f87171", src: "Мясо, нори, Dr.PONG" },
  { id: "copper", name: "Медь", u: "мг", d: 1.5, p: 1, c: "#e879f9", src: "Шоколад, орехи, добавка" },
  { id: "magnesium", name: "Магний", u: "мг", d: 300, p: 3, c: "#60a5fa", src: "Шоколад, шпинат, добавка" },
  { id: "iodine", name: "Йод", u: "мкг", d: 150, p: 2, c: "#2dd4bf", src: "Нори 70мкг/пакетик" },
  { id: "iron", name: "Железо", u: "мг", d: 8, p: 3, c: "#ef4444", src: "Мясо, шоколад (в норме)" },
  { id: "calcium", name: "Кальций", u: "мг", d: 800, p: 3, c: "#e2e8f0", src: "Протеин-молоко, сыр" },
  { id: "potassium", name: "Калий", u: "мг", d: 2600, p: 3, c: "#a3e635", src: "Бананы, яблоки, курица" },
  { id: "fiber", name: "Клетчатка", u: "г", d: 25, p: 3, c: "#86efac", src: "Яблоки, овощи, нори" },
];
const SUPPS = [
  { id: "zn1", n: "Dr.PONG Цинк x1", m: { zinc: 15 } },
  { id: "zn2", n: "Dr.PONG Цинк x2", m: { zinc: 30 } },
  { id: "drb", n: "Dr.PONG B6/B12", m: { b6: 25, b12: 500 } },
  { id: "bco", n: "Blink Коллаген", m: { collagen: 2000, vitC: 30 } },
  { id: "vd5", n: "Витамин D 5000МЕ", m: { vitD: 5000 } },
  { id: "om3", n: "Омега-3 2г", m: { omega3: 2 } },
  { id: "vc5", n: "Витамин C 500мг", m: { vitC: 500 } },
  { id: "cu", n: "Медь 1.5мг", m: { copper: 1.5 } },
  { id: "mg4", n: "Магний 400мг", m: { magnesium: 400 } },
];

const STORAGE_KEY = "rin-nutrition-v4";
function loadData(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function persistData(d: Record<string, any>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) { console.error(e); }
}

async function aiParse(text: string) {
  try {
    const r = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!r.ok) throw new Error("API error");
    return await r.json();
  } catch (e) { console.error(e); return null; }
}

const dk = (d: Date) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const MN = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const fmtD = (d: Date) => WD[d.getDay()] + ", " + d.getDate() + " " + MN[d.getMonth()];

function weekOf(ref: Date) {
  const d = new Date(ref);
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, function(_, i) { const x = new Date(mon); x.setDate(mon.getDate() + i); return x; });
}

function weekTotals(all: Record<string, any>, wk: Date[]) {
  const mac: Record<string, number> = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const mic: Record<string, number> = {};
  MICROS.forEach(function(m) { mic[m.id] = 0; });
  const daily: Record<string, number>[] = [];
  wk.forEach(function(d) {
    const dd = all[dk(d)] || {};
    const meals = dd.meals || [];
    const dm: Record<string, number> = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
    meals.forEach(function(m: any) {
      dm.kcal += parseInt(m.kcal) || 0;
      dm.protein += parseInt(m.protein) || 0;
      dm.fat += parseInt(m.fat) || 0;
      dm.carbs += parseInt(m.carbs) || 0;
      if (m.micros) {
        Object.entries(m.micros).forEach(function(entry) {
          const k = entry[0];
          const v = entry[1];
          if (mic[k] !== undefined) mic[k] += parseFloat(v as string) || 0;
        });
      }
    });
    const sp = dd.supplements || {};
    Object.entries(sp).forEach(function(entry) {
      const k = entry[0];
      const v = entry[1];
      if (mic[k] !== undefined) mic[k] += parseFloat(v as string) || 0;
    });
    Object.keys(mac).forEach(function(k) { mac[k] += dm[k]; });
    daily.push(dm);
  });
  return { mac: mac, mic: mic, daily: daily };
}

function dynamicTarget(weekMac: Record<string, number>, todayIdx: number) {
  const targets: Record<string, [number, number]> = {};
  Object.entries(DAILY).forEach(function(entry) {
    const k = entry[0];
    const min = entry[1][0];
    const max = entry[1][1];
    const remaining = Math.max(min * 7 - weekMac[k], 0);
    const remainMax = Math.max(max * 7 - weekMac[k], 0);
    const daysLeft = Math.max(7 - todayIdx, 1);
    targets[k] = [Math.round(remaining / daysLeft), Math.round(remainMax / daysLeft)];
  });
  return targets;
}

const S = { bg: "#0a0a0a", card: "#141414", input: "#1a1a1a", brd: "#1e1e1e", brd2: "#252525", txt: "#ddd", acc: "#f97316" };

function Bar(props: { label: string; val: number; min: number; max: number; unit: string; color: string; adj?: string }) {
  const { label, val, min, max, unit, color, adj } = props;
  const p = Math.min((val / max) * 100, 120);
  const mp = (min / max) * 100;
  const st = val >= min && val <= max ? "hit" : val > max ? "over" : val < min * 0.5 ? "crit" : "under";
  const sc = st === "hit" ? "#4ade80" : st === "crit" ? "#ef4444" : "#fbbf24";
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: "#777" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ color: sc, fontWeight: 700 }}>{val}{unit}</span>
          <span style={{ color: "#333", fontSize: 9 }}>/{min}--{max}</span>
          {adj && <span style={{ color: "#555", fontSize: 9 }}>{adj}</span>}
        </div>
      </div>
      <div style={{ height: 5, background: "#1a1a1a", borderRadius: 3, position: "relative" }}>
        <div style={{ position: "absolute", left: mp + "%", top: -1, bottom: -1, width: 1, background: "#2a2a2a", zIndex: 1 }} />
        <div style={{ height: "100%", borderRadius: 3, width: Math.min(p, 100) + "%", background: "linear-gradient(90deg," + color + "," + sc + ")", transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function MicroRow(props: { m: typeof MICROS[0]; val: number; daysIn: number }) {
  const { m, val, daysIn } = props;
  const wk = m.d * 7;
  const pace = daysIn > 0 ? val / daysIn : 0;
  const proj = pace * 7;
  const good = proj >= wk * 0.9;
  const ok = proj >= wk * 0.5;
  const p = Math.min((val / wk) * 100, 100);
  const need = daysIn < 7 ? Math.round(((wk - val) / Math.max(7 - daysIn, 1)) * 10) / 10 : 0;
  return (
    <div style={{ background: S.input, borderRadius: 10, padding: "8px 10px", border: "1px solid " + (good ? "#16653422" : ok ? "#854d0e22" : "#1e1e1e") }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: m.c }}>{m.name}</span>
        <span style={{ fontSize: 8, color: "#444", fontFamily: "'JetBrains Mono', monospace" }}>P{m.p}</span>
      </div>
      <div style={{ height: 3, background: "#222", borderRadius: 2, marginBottom: 3 }}>
        <div style={{ height: "100%", borderRadius: 2, width: p + "%", background: m.c, opacity: 0.7, transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        <span style={{ color: good ? "#4ade80" : ok ? "#fbbf24" : "#ef4444" }}>{Math.round(val * 10) / 10}{m.u}</span>
        <span style={{ color: "#444" }}>/{Math.round(wk)}{m.u}</span>
      </div>
      <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>
        ~{Math.round(pace * 10) / 10}{m.u}/д {good ? "✓ норма" : ok ? "~ почти" : "нужно " + need + m.u + "/д"}
      </div>
      <div style={{ fontSize: 8, color: "#2a2a2a", marginTop: 2 }}>{m.src}</div>
    </div>
  );
}

export default function Home() {
  const [all, setAll] = useState<Record<string, any>>({});
  const [cur, setCur] = useState(new Date());
  const [ld, setLd] = useState(true);
  const [tab, setTab] = useState("day");
  const [imp, setImp] = useState(false);
  const [man, setMan] = useState(false);
  const [sup, setSup] = useState(false);
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ food: "", time: "", protein: "", kcal: "", fat: "", carbs: "", where: "" });

  const key = dk(cur);
  const dd = all[key] || { meals: [], supplements: {} };
  const meals: any[] = dd.meals || [];
  const supps: Record<string, number> = dd.supplements || {};
  const wk = weekOf(cur);
  const todayK = dk(new Date());
  const todayIdx = wk.findIndex(function(d) { return dk(d) === todayK; });
  const daysIn = wk.filter(function(d) { return dk(d) <= todayK; }).length;
  const wt = weekTotals(all, wk);
  const WKLY = Object.fromEntries(Object.entries(DAILY).map(function(entry) { return [entry[0], [entry[1][0] * 7, entry[1][1] * 7]]; })) as Record<string, [number, number]>;
  const dt = meals.reduce(function(a: any, m: any) { return { kcal: a.kcal + (parseInt(m.kcal) || 0), protein: a.protein + (parseInt(m.protein) || 0), fat: a.fat + (parseInt(m.fat) || 0), carbs: a.carbs + (parseInt(m.carbs) || 0) }; }, { kcal: 0, protein: 0, fat: 0, carbs: 0 });
  const spentBefore: Record<string, number> = {};
  Object.keys(DAILY).forEach(function(k) { spentBefore[k] = wt.mac[k] - dt[k]; });
  const dynTargets = dynamicTarget(spentBefore, todayIdx >= 0 ? todayIdx : daysIn - 1);

  useEffect(function() { setAll(loadData()); setLd(false); }, []);
  const sv = useCallback(function(nd: Record<string, any>) { setAll(nd); persistData(nd); }, []);
  const addM = function(nm: any[]) { const wi = nm.map(function(m) { return Object.assign({}, m, { id: Date.now() + Math.random() }); }); sv(Object.assign({}, all, { [key]: Object.assign({}, dd, { meals: meals.concat(wi) }) })); };
  const delM = function(id: number) { sv(Object.assign({}, all, { [key]: Object.assign({}, dd, { meals: meals.filter(function(m: any) { return m.id !== id; }) }) })); };
  const togSup = function(p: typeof SUPPS[0]) {
    const ns = Object.assign({}, supps);
    const on = Object.entries(p.m).every(function(entry) { return (ns[entry[0]] || 0) >= entry[1]; });
    Object.entries(p.m).forEach(function(entry) { if (on) { ns[entry[0]] = Math.max((ns[entry[0]] || 0) - entry[1], 0); } else { ns[entry[0]] = (ns[entry[0]] || 0) + entry[1]; } });
    sv(Object.assign({}, all, { [key]: Object.assign({}, dd, { supplements: ns }) }));
  };
  const supOn = function(p: typeof SUPPS[0]) { return Object.entries(p.m).every(function(entry) { return (supps[entry[0]] || 0) >= entry[1]; }); };
  const doParse = async function() { if (!txt.trim()) return; setBusy(true); setErr(""); setPrev(null); const r = await aiParse(txt); setBusy(false); if (r && Array.isArray(r) && r.length > 0) setPrev(r); else setErr("Не разобрал — попробуй текст с цифрами КБЖУ"); };
  const confirmImp = function() { if (prev) { addM(prev); setPrev(null); setTxt(""); setImp(false); } };
  const addMan = function() { if (f.food) { addM([f]); setF({ food: "", time: "", protein: "", kcal: "", fat: "", carbs: "", where: "" }); setMan(false); } };
  const go = function(o: number) { const d = new Date(cur); d.setDate(d.getDate() + o); setCur(d); };
  const isT = key === todayK;

  if (ld) return (
    <div style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 8 }}>
      <span style={{ fontSize: 44 }}>🍪</span>
      <span style={{ color: "#333", fontSize: 11, letterSpacing: 2 }}>ЗАГРУЗКА...</span>
    </div>
  );

  var pcFn = function(c: number) { return c >= 100 ? "#4ade80" : c >= 50 ? "#fbbf24" : "#ef4444"; };
  var wpc = wt.mac.protein >= WKLY.protein[0] ? "#4ade80" : wt.mac.protein >= WKLY.protein[0] * 0.5 ? "#fbbf24" : "#ef4444";
  var card: React.CSSProperties = { background: S.card, borderRadius: 14, padding: 12, marginBottom: 10, border: "1px solid " + S.brd };
  var inp: React.CSSProperties = { background: S.input, border: "1px solid " + S.brd2, borderRadius: 8, padding: "7px 10px", color: S.txt, fontSize: 12, outline: "none", boxSizing: "border-box" as const, fontFamily: "'JetBrains Mono', monospace" };
  var proteinLeft = Math.max(dynTargets.protein[0] - dt.protein, 0);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.txt, fontFamily: "'DM Sans', -apple-system, sans-serif", maxWidth: 480, margin: "0 auto", padding: "0 12px 80px" }}>

      <div style={{ padding: "16px 0 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 9, color: S.acc, fontWeight: 700, letterSpacing: 2.5 }}>🍪 КОРЖИК-ТРЕКЕР v4</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>Питание Рин</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ background: pcFn(dt.protein) + "08", border: "1px solid " + pcFn(dt.protein) + "25", borderRadius: 12, padding: "4px 12px", textAlign: "center" as const }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: pcFn(dt.protein), lineHeight: 1 }}>{dt.protein}</div>
            <div style={{ fontSize: 8, color: "#555", letterSpacing: 1 }}>ДЕНЬ</div>
          </div>
          <div style={{ background: wpc + "08", border: "1px solid " + wpc + "25", borderRadius: 12, padding: "4px 12px", textAlign: "center" as const }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: wpc, lineHeight: 1 }}>{wt.mac.protein}</div>
            <div style={{ fontSize: 8, color: "#555", letterSpacing: 1 }}>НЕДЕЛЯ</div>
          </div>
        </div>
      </div>

      {isT && tab === "day" && daysIn > 1 && (
        <div style={{ background: proteinLeft === 0 ? "linear-gradient(135deg, #052e1644, #0a0a0a)" : "linear-gradient(135deg, #1a120a, #0a0a0a)", borderRadius: 14, padding: "10px 14px", marginBottom: 10, border: "1px solid " + (proteinLeft === 0 ? "#16653433" : "#f9731622") }} className="fi">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 9, color: "#666", fontWeight: 700, letterSpacing: 1.5, marginBottom: 3 }}>ЦЕЛЬ НА СЕГОДНЯ (скорректированная)</div>
              <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                <span><span style={{ color: "#ef4444", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{dynTargets.protein[0]}--{dynTargets.protein[1]}</span> <span style={{ color: "#555" }}>белок</span></span>
                <span><span style={{ color: S.acc, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{dynTargets.kcal[0]}--{dynTargets.kcal[1]}</span> <span style={{ color: "#555" }}>ккал</span></span>
              </div>
            </div>
            {proteinLeft > 0 ? (
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "#fbbf24", lineHeight: 1 }}>{proteinLeft}г</div>
                <div style={{ fontSize: 8, color: "#666" }}>ещё белка</div>
              </div>
            ) : <div style={{ fontSize: 18 }}>✅</div>}
          </div>
          {dynTargets.protein[0] > DAILY.protein[1] && (
            <div style={{ fontSize: 9, color: "#ef4444", marginTop: 4, opacity: 0.7 }}>Вчера недобор — сегодня нужно чуть больше обычного</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {["day", "week", "micros"].map(function(id) {
          var labels: Record<string, string> = { day: "📅 День", week: "📊 Неделя", micros: "💊 Микро" };
          return (
            <button key={id} onClick={function() { setTab(id); }} style={{ flex: 1, padding: 7, borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", background: tab === id ? S.acc : "#141414", color: tab === id ? "#fff" : "#666", border: "1px solid " + (tab === id ? S.acc : "#1e1e1e") }}>{labels[id]}</button>
          );
        })}
      </div>

      {tab === "day" && <div className="fi">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <button onClick={function() { go(-1); }} style={{ background: "#141414", border: "1px solid #1e1e1e", color: "#ddd", borderRadius: 10, padding: "4px 14px", cursor: "pointer", fontSize: 14 }}>&#8592;</button>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtD(cur)}</div>
            {isT && <div style={{ fontSize: 9, color: S.acc, fontWeight: 600 }}>сегодня</div>}
          </div>
          <button onClick={function() { go(1); }} style={{ background: "#141414", border: "1px solid #1e1e1e", color: "#ddd", borderRadius: 10, padding: "4px 14px", cursor: "pointer", fontSize: 14 }}>&#8594;</button>
        </div>

        <div style={card}>
          <Bar label="ККАЛ" val={dt.kcal} min={dynTargets.kcal[0] || DAILY.kcal[0]} max={dynTargets.kcal[1] || DAILY.kcal[1]} unit="" color={S.acc} />
          <Bar label="БЕЛОК" val={dt.protein} min={dynTargets.protein[0] || DAILY.protein[0]} max={dynTargets.protein[1] || DAILY.protein[1]} unit="г" color="#ef4444" />
          <Bar label="ЖИРЫ" val={dt.fat} min={dynTargets.fat[0] || DAILY.fat[0]} max={dynTargets.fat[1] || DAILY.fat[1]} unit="г" color="#fbbf24" />
          <Bar label="УГЛЕВ" val={dt.carbs} min={dynTargets.carbs[0] || DAILY.carbs[0]} max={dynTargets.carbs[1] || DAILY.carbs[1]} unit="г" color="#3b82f6" />
        </div>

        <div style={card}>
          <button onClick={function() { setSup(!sup); }} style={{ width: "100%", background: "none", border: "none", color: "#ddd", cursor: "pointer", display: "flex", justifyContent: "space-between", padding: 0, fontSize: 11, fontWeight: 600 }}>
            <span>💊 Добавки</span><span style={{ color: "#555" }}>{SUPPS.filter(supOn).length}/{SUPPS.length} {sup ? "▾" : "▸"}</span>
          </button>
          {sup && <div style={{ marginTop: 8, display: "flex", flexDirection: "column" as const, gap: 4 }} className="fi">
            {SUPPS.map(function(p) { var on = supOn(p); return (
              <button key={p.id} onClick={function() { togSup(p); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 10, cursor: "pointer", background: on ? "#052e16" : "#1a1a1a", border: "1px solid " + (on ? "#166534" : "#252525"), fontSize: 11, color: on ? "#4ade80" : "#777", textAlign: "left" as const }}>
                <span>{on ? "✓" : "○"} {p.n}</span>
                <span style={{ fontSize: 9, color: "#444" }}>{Object.entries(p.m).map(function(entry) { var mi = MICROS.find(function(x) { return x.id === entry[0]; }); return mi ? mi.name + " " + entry[1] : ""; }).join(", ")}</span>
              </button>);
            })}
          </div>}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button onClick={function() { setImp(!imp); setMan(false); }} style={{ flex: 1, background: imp ? S.acc : "#141414", border: "1px solid " + (imp ? S.acc : "#1e1e1e"), color: imp ? "#fff" : "#ddd", borderRadius: 10, padding: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🤖 От Коржика</button>
          <button onClick={function() { setMan(!man); setImp(false); }} style={{ flex: 1, background: man ? "#252525" : "#141414", border: "1px solid " + (man ? "#333" : "#1e1e1e"), color: "#ddd", borderRadius: 10, padding: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✏️ Вручную</button>
        </div>

        {imp && <div style={Object.assign({}, card, { borderColor: "#f9731633" })} className="fi">
          <div style={{ fontSize: 10, color: "#555", marginBottom: 6 }}>Вставь сообщение от Коржика с разбором еды</div>
          <textarea placeholder="Завтрак: яйца 2шт + бекон..." value={txt} onChange={function(e) { setTxt(e.target.value); }} style={{ width: "100%", minHeight: 100, background: "#111", border: "1px solid #252525", borderRadius: 10, padding: 12, color: "#ddd", fontSize: 12, resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }} />
          <button onClick={doParse} disabled={busy || !txt.trim()} style={{ width: "100%", marginTop: 8, background: busy ? "#333" : S.acc, border: "none", color: "#fff", borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: !txt.trim() ? 0.3 : 1 }}>{busy ? "🍪 Разбираю..." : "🤖 Разобрать"}</button>
          {err && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 6, padding: "6px 10px", background: "#ef444411", borderRadius: 8 }}>{err}</div>}
          {prev && <div style={{ marginTop: 10 }} className="fi">
            <div style={{ fontSize: 11, color: "#4ade80", marginBottom: 6, fontWeight: 700 }}>✓ Распознано {prev.length} записей:</div>
            {prev.map(function(m, i) { return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#111", borderRadius: 8, marginBottom: 4, fontSize: 11, border: "1px solid #1e1e1e" }}>
                <span style={{ color: "#ddd", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{m.food}</span>
                <div style={{ display: "flex", gap: 6, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ color: "#ef4444" }}>{m.protein}б</span>
                  <span style={{ color: "#fbbf24" }}>{m.fat}ж</span>
                  <span style={{ color: "#3b82f6" }}>{m.carbs}у</span>
                  <span style={{ color: S.acc }}>{m.kcal}</span>
                </div>
              </div>);
            })}
            <div style={{ padding: "6px 10px", background: "#0a0a0a", borderRadius: 8, marginTop: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#666", display: "flex", justifyContent: "space-between" }}>
              <span>Итого:</span>
              <span>
                <span style={{ color: "#ef4444" }}>{prev.reduce(function(s, m) { return s + (parseInt(m.protein) || 0); }, 0)}б</span>{" "}
                <span style={{ color: "#fbbf24" }}>{prev.reduce(function(s, m) { return s + (parseInt(m.fat) || 0); }, 0)}ж</span>{" "}
                <span style={{ color: "#3b82f6" }}>{prev.reduce(function(s, m) { return s + (parseInt(m.carbs) || 0); }, 0)}у</span>{" "}
                <span style={{ color: S.acc }}>{prev.reduce(function(s, m) { return s + (parseInt(m.kcal) || 0); }, 0)} ккал</span>
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={confirmImp} style={{ flex: 1, background: "#4ade80", border: "none", color: "#000", borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Добавить</button>
              <button onClick={function() { setPrev(null); }} style={{ background: "#252525", border: "none", color: "#888", borderRadius: 10, padding: "10px 16px", cursor: "pointer" }}>✕</button>
            </div>
          </div>}
        </div>}

        {man && <div style={Object.assign({}, card, { borderColor: "#333" })} className="fi">
          <input placeholder="Что съела" value={f.food} onChange={function(e) { setF(Object.assign({}, f, { food: e.target.value })); }} style={Object.assign({}, inp, { width: "100%", marginBottom: 5, fontFamily: "'DM Sans', sans-serif" })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 5 }}>
            <input placeholder="Время" value={f.time} onChange={function(e) { setF(Object.assign({}, f, { time: e.target.value })); }} style={Object.assign({}, inp, { fontFamily: "'DM Sans', sans-serif" })} />
            <input placeholder="Где" value={f.where} onChange={function(e) { setF(Object.assign({}, f, { where: e.target.value })); }} style={Object.assign({}, inp, { fontFamily: "'DM Sans', sans-serif" })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
            <input placeholder="Ккал" type="number" value={f.kcal} onChange={function(e) { setF(Object.assign({}, f, { kcal: e.target.value })); }} style={Object.assign({}, inp, { color: S.acc })} />
            <input placeholder="Белок" type="number" value={f.protein} onChange={function(e) { setF(Object.assign({}, f, { protein: e.target.value })); }} style={Object.assign({}, inp, { color: "#ef4444" })} />
            <input placeholder="Жиры" type="number" value={f.fat} onChange={function(e) { setF(Object.assign({}, f, { fat: e.target.value })); }} style={Object.assign({}, inp, { color: "#fbbf24" })} />
            <input placeholder="Углев" type="number" value={f.carbs} onChange={function(e) { setF(Object.assign({}, f, { carbs: e.target.value })); }} style={Object.assign({}, inp, { color: "#3b82f6" })} />
          </div>
          <button onClick={addMan} style={{ width: "100%", background: "#252525", border: "none", color: "#fff", borderRadius: 10, padding: 9, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Записать</button>
        </div>}

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#444" }}>🍽 ЕДА ({meals.length})</span>
            {meals.length > 0 && <button onClick={function() { sv(Object.assign({}, all, { [key]: Object.assign({}, dd, { meals: [] }) })); }} style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: 10 }}>очистить</button>}
          </div>
          {meals.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: 28, color: "#2a2a2a", fontSize: 12, lineHeight: 1.6 }}>Фоткай, присылай Коржику,<br />вставляй разбор сюда 🍪</div>
          ) : meals.map(function(m: any) { return (
            <div key={m.id} style={{ padding: "7px 10px", background: "#141414", borderRadius: 10, marginBottom: 4, border: "1px solid #1e1e1e" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#ddd", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{m.food}</div>
                  <div style={{ fontSize: 9, color: "#444" }}>{m.time}{m.where ? " · " + m.where : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 6, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginLeft: 6, alignItems: "center" }}>
                  <span style={{ color: "#ef4444" }}>{m.protein}б</span>
                  <span style={{ color: "#555" }}>{m.kcal}</span>
                  <button onClick={function() { delM(m.id); }} style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: 14, padding: 0 }}>x</button>
                </div>
              </div>
              {m.micros && Object.keys(m.micros).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 3, marginTop: 4 }}>
                  {Object.entries(m.micros).map(function(entry) { var mi = MICROS.find(function(x) { return x.id === entry[0]; }); if (!mi || !entry[1]) return null; return (
                    <span key={entry[0]} style={{ fontSize: 8, color: mi.c, background: mi.c + "0d", padding: "1px 5px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>{mi.name} {Math.round((entry[1] as number) * 10) / 10}</span>
                  ); })}
                </div>
              )}
            </div>);
          })}
        </div>

        {meals.length > 0 && (
          <div style={{ background: dt.protein >= dynTargets.protein[0] ? "#052e1622" : "#14141422", borderRadius: 14, padding: 12, border: "1px solid " + (dt.protein >= dynTargets.protein[0] ? "#16653433" : "#1e1e1e"), textAlign: "center" as const }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: dt.protein >= dynTargets.protein[0] ? "#4ade80" : dt.protein >= 50 ? "#fbbf24" : "#666" }}>
              {dt.protein >= dynTargets.protein[0] ? "🎯 ЦЕЛЬ ДНЯ" : dt.protein >= 50 ? "💪 Полпути" : "🌱 Начало"}
            </div>
            <div style={{ fontSize: 11, color: "#555" }}>
              {dt.protein >= dynTargets.protein[0] ? dt.protein + "г — Гай-сенсей гордится" : "Ещё " + proteinLeft + "г белка до цели"}
            </div>
          </div>
        )}
      </div>}

      {tab === "week" && <div className="fi">
        <div style={{ textAlign: "center" as const, fontSize: 12, color: "#666", marginBottom: 10 }}>{fmtD(wk[0])} — {fmtD(wk[6])} <span style={{ color: "#444" }}>(день {daysIn}/7)</span></div>
        <div style={card}>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 8, fontWeight: 700, letterSpacing: 1.5 }}>БЕЛОК ЗА НЕДЕЛЮ</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 75 }}>
            {wt.daily.map(function(d, i) {
              var h = d.protein > 0 ? Math.max((d.protein / 140) * 58, 3) : 2;
              var c = d.protein >= 100 ? "#4ade80" : d.protein >= 50 ? "#fbbf24" : d.protein > 0 ? "#ef4444" : "#1a1a1a";
              var it = dk(wk[i]) === todayK;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 9, color: "#444", fontFamily: "'JetBrains Mono', monospace" }}>{d.protein || ""}</span>
                  <div style={{ width: "100%", maxWidth: 30, height: h, background: c, borderRadius: 4, border: it ? "1.5px solid #f97316" : "none" }} />
                  <span style={{ fontSize: 9, color: it ? S.acc : "#444", fontWeight: it ? 700 : 400 }}>{WD[wk[i].getDay()]}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 8, fontWeight: 700, letterSpacing: 1.5 }}>НЕДЕЛЬНЫЙ БЮДЖЕТ</div>
          <Bar label="ККАЛ" val={wt.mac.kcal} min={WKLY.kcal[0]} max={WKLY.kcal[1]} unit="" color={S.acc} />
          <Bar label="БЕЛОК" val={wt.mac.protein} min={WKLY.protein[0]} max={WKLY.protein[1]} unit="г" color="#ef4444" />
          <Bar label="ЖИРЫ" val={wt.mac.fat} min={WKLY.fat[0]} max={WKLY.fat[1]} unit="г" color="#fbbf24" />
          <Bar label="УГЛЕВ" val={wt.mac.carbs} min={WKLY.carbs[0]} max={WKLY.carbs[1]} unit="г" color="#3b82f6" />
          <div style={{ fontSize: 10, color: "#444", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>Среднее: <span style={{ color: "#ef4444" }}>{Math.round(wt.mac.protein / Math.max(daysIn, 1))}г белка</span> · <span style={{ color: S.acc }}>{Math.round(wt.mac.kcal / Math.max(daysIn, 1))} ккал</span>/день</div>
        </div>
        {daysIn < 7 && <div style={card}>
          <div style={{ fontSize: 10, color: "#444", fontWeight: 700, marginBottom: 8, letterSpacing: 1.5 }}>ОСТАВШИЙСЯ БЮДЖЕТ</div>
          {Object.entries(WKLY).map(function(entry) {
            var k = entry[0];
            var mn = entry[1][0];
            var left = Math.max(mn - wt.mac[k], 0);
            var perDay = Math.round(left / Math.max(7 - daysIn, 1));
            var orig = DAILY[k];
            var labels: Record<string, string> = { kcal: "Ккал", protein: "Белок", fat: "Жиры", carbs: "Углев" };
            var colors: Record<string, string> = { kcal: S.acc, protein: "#ef4444", fat: "#fbbf24", carbs: "#3b82f6" };
            var changed = perDay > orig[1] || perDay < orig[0];
            return (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1a1a1a", fontSize: 11 }}>
                <span style={{ color: "#666" }}>{labels[k]}</span>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: left === 0 ? "#4ade80" : "#fbbf24" }}>{left === 0 ? "✓" : left}</span>
                  <span style={{ color: changed ? colors[k] : "#444", fontWeight: changed ? 700 : 400 }}>{perDay}/д</span>
                  {changed && <span style={{ fontSize: 8, color: "#555" }}>(было {orig[0]}--{orig[1]})</span>}
                </div>
              </div>
            );
          })}
        </div>}
      </div>}

      {tab === "micros" && <div className="fi">
        <div style={{ textAlign: "center" as const, fontSize: 12, color: "#666", marginBottom: 10 }}>Микронутриенты за неделю <span style={{ color: "#444" }}>(день {daysIn}/7)</span></div>
        {[1, 2, 3].map(function(pri) { return (
          <div key={pri} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#444", fontWeight: 700, marginBottom: 6, letterSpacing: 1.5 }}>
              {pri === 1 ? "🔴 ПРИОРИТЕТ 1 — ДЕФИЦИТЫ" : pri === 2 ? "🟡 ПРИОРИТЕТ 2 — РЕКОМПОЗИЦИЯ" : "🟢 ПРИОРИТЕТ 3 — ПОДДЕРЖКА"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {MICROS.filter(function(m) { return m.p === pri; }).map(function(m) { return <MicroRow key={m.id} m={m} val={wt.mic[m.id] || 0} daysIn={daysIn} />; })}
            </div>
          </div>);
        })}
        <div style={Object.assign({}, card, { fontSize: 11, color: "#555", lineHeight: 1.6 })}>
          <strong style={{ color: "#666" }}>Как считается:</strong><br />
          Еда — AI оценивает микронутриенты при импорте.<br />
          Добавки — отмечаешь во вкладке День.<br />
          Бюджет = дневная норма x 7. Темп = факт / дней прошло.
        </div>
      </div>}

      <div style={{ textAlign: "center" as const, padding: "24px 0", fontSize: 10, color: "#1e1e1e" }}>Данные, не мораль 🍪</div>
    </div>
  );
}
