"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Shield, Flame, Swords, ScrollText, BarChart3, Settings, Droplet, Moon, Pill,
  ChevronLeft, ChevronRight, Plus, X, Check, Minus, Trash2, Sparkles, Loader, Gift, Lock
} from "lucide-react";

/* ═════════ утилиты ═════════ */
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayISO = () => iso(new Date());
const parseISO = (s) => { const p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const shiftD = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const lastN = (n, end) => Array.from({ length: n }, (_, i) => shiftD(end, -(n - 1 - i)));
const weekStart = (s) => { const d = parseISO(s); return shiftD(s, -((d.getDay() + 6) % 7)); };
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
const nn = (v) => { const x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) ? x : 0; };
const r1 = (x) => Math.round(x * 10) / 10;
const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const longDate = (s) => { const d = parseISO(s); return WD[d.getDay()] + ", " + d.getDate() + " " + MN[d.getMonth()]; };
const shortDate = (s) => { const d = parseISO(s); return d.getDate() + "." + pad(d.getMonth() + 1); };
const uid = () => Math.random().toString(36).slice(2, 10);
/* Пока данные живут в браузере (localStorage). Позже сюда подключается Supabase. */
const K = (k) => "gl:" + k;
const sget = async (key, fb) => { try { const r = localStorage.getItem(K(key)); return r != null ? JSON.parse(r) : fb; } catch (e) { return fb; } };
const sset = async (key, v) => { try { localStorage.setItem(K(key), JSON.stringify(v)); } catch (e) { console.error(e); } };

/* ═════════ справочники ═════════ */
const MICROS = [
  { k: "zinc", l: "Цинк", u: "мг", rda: 8, p: 1 },
  { k: "iron", l: "Железо", u: "мг", rda: 18, p: 1 },
  { k: "vitD", l: "Витамин D", u: "мкг", rda: 15, p: 1 },
  { k: "b12", l: "B12", u: "мкг", rda: 2.4, p: 1 },
  { k: "iodine", l: "Йод", u: "мкг", rda: 150, p: 1 },
  { k: "magnesium", l: "Магний", u: "мг", rda: 320, p: 2 },
  { k: "calcium", l: "Кальций", u: "мг", rda: 1000, p: 2 },
  { k: "omega3", l: "Омега-3", u: "г", rda: 1.1, p: 2 },
  { k: "copper", l: "Медь", u: "мг", rda: 0.9, p: 2 },
  { k: "collagen", l: "Коллаген", u: "г", rda: 10, p: 2 },
  { k: "potassium", l: "Калий", u: "мг", rda: 3500, p: 3 },
  { k: "b6", l: "B6", u: "мг", rda: 1.3, p: 3 },
  { k: "vitC", l: "Витамин C", u: "мг", rda: 75, p: 3 },
  { k: "fiber", l: "Клетчатка", u: "г", rda: 25, p: 3 }
];
const PRI = { 1: "Приоритет 1 — дефициты", 2: "Приоритет 2 — рекомпозиция", 3: "Приоритет 3 — поддержка" };
const NUTRI = ["kcal", "p", "f", "c"].concat(MICROS.map((m) => m.k));
const METS = [{ l: "Ходьба", met: 3.5 }, { l: "Бег", met: 9 }, { l: "Зал", met: 5 }, { l: "Йога", met: 3 },
{ l: "Плавание", met: 7 }, { l: "Велосипед", met: 7.5 }, { l: "Танцы", met: 5 }, { l: "Растяжка", met: 2.5 }];
const BODY = [{ k: "w", l: "Вес", u: "кг" }, { k: "waist", l: "Талия", u: "см" }, { k: "chest", l: "Грудь", u: "см" },
{ k: "hips", l: "Бёдра", u: "см" }, { k: "arm", l: "Бицепс", u: "см" }, { k: "thigh", l: "Бедро", u: "см" }, { k: "neck", l: "Шея", u: "см" }];
const MOODS = [{ v: 1, l: "тяжело" }, { v: 2, l: "так себе" }, { v: 3, l: "ровно" }, { v: 4, l: "хорошо" }, { v: 5, l: "отлично" }];


/* Каталог-шаблон: значения на 100 г, либо на 1 шт (u: "pcs", w — вес штуки).
   Расширяется дописыванием строк — формат один и тот же. */
const CATALOG = [
  { id: "chicken", n: "Куриная грудка", t: "Белок", u: "g", v: { kcal: 100, p: 20, f: 2.2, zinc: 1.1, b6: 0.55, potassium: 290 } },
  { id: "beef", n: "Говядина", t: "Белок", u: "g", v: { kcal: 250, p: 26, f: 15, iron: 2.6, zinc: 4.8, b12: 2.6 } },
  { id: "salmon", n: "Лосось", t: "Белок", u: "g", v: { kcal: 208, p: 20, f: 13, omega3: 2.3, vitD: 13, b12: 3 } },
  { id: "shrimp", n: "Креветки", t: "Белок", u: "g", v: { kcal: 99, p: 20, zinc: 1.5, b12: 1.5, iodine: 35 } },
  { id: "egg", n: "Яйцо", t: "Белок", u: "pcs", w: 55, v: { kcal: 70, p: 6, f: 5, c: 0.5, zinc: 0.6, vitD: 1, b12: 0.5 } },
  { id: "tofu", n: "Тофу", t: "Белок", u: "g", v: { kcal: 76, p: 8, f: 4.8, c: 1.9, calcium: 350, iron: 5.4, magnesium: 30 } },
  { id: "edamame", n: "Эдамаме", t: "Белок", u: "g", v: { kcal: 121, p: 11, f: 5, c: 9, zinc: 1.4, fiber: 5 } },
  { id: "whey", n: "Протеин (порошок)", t: "Белок", u: "g", v: { kcal: 400, p: 75, calcium: 250, b12: 1 } },
  { id: "curd", n: "Творог 5%", t: "Молочное", u: "g", v: { kcal: 121, p: 17, f: 5, calcium: 120, b12: 0.6 } },
  { id: "greek", n: "Греческий йогурт", t: "Молочное", u: "g", v: { kcal: 60, p: 10, f: 0.4, c: 3.6, calcium: 110, b12: 0.5 } },
  { id: "protmilk", n: "Протеиновое молоко", t: "Молочное", u: "g", v: { kcal: 50, p: 7.1, calcium: 229, b12: 0.43, potassium: 163 } },
  { id: "rice", n: "Рис варёный", t: "Гарнир", u: "g", v: { kcal: 130, p: 2.7, c: 28, magnesium: 12 } },
  { id: "oats", n: "Овсянка сухая", t: "Гарнир", u: "g", v: { kcal: 370, p: 13, f: 7, c: 60, fiber: 10, magnesium: 140, iron: 4 } },
  { id: "onigiri", n: "Онигири с лососем", t: "Гарнир", u: "pcs", w: 110, v: { kcal: 200, p: 7, f: 3, c: 38, omega3: 0.3, vitD: 2.5, b12: 1 } },
  { id: "apple", n: "Зелёное яблоко", t: "Овощи и фрукты", u: "pcs", w: 180, v: { kcal: 95, c: 25, fiber: 4, potassium: 195, vitC: 8 } },
  { id: "banana", n: "Банан", t: "Овощи и фрукты", u: "pcs", w: 120, v: { kcal: 105, p: 1.3, c: 27, potassium: 400, fiber: 2.5, b6: 0.4 } },
  { id: "kiwi", n: "Киви", t: "Овощи и фрукты", u: "pcs", w: 75, v: { kcal: 45, p: 0.8, c: 10, vitC: 70, potassium: 215, fiber: 2.5 } },
  { id: "spinach", n: "Шпинат", t: "Овощи и фрукты", u: "g", v: { kcal: 23, p: 2.9, magnesium: 80, iron: 2.7, fiber: 2.2, potassium: 560, vitC: 28 } },
  { id: "nori", n: "Нори, лист", t: "Овощи и фрукты", u: "pcs", w: 4, v: { kcal: 5, p: 1, iodine: 70, b12: 1 } },
  { id: "pumpkin", n: "Тыквенные семечки", t: "Орехи", u: "g", v: { kcal: 559, p: 30, f: 49, c: 11, zinc: 7.7, magnesium: 592, iron: 8.8 } },
  { id: "cashew", n: "Кешью", t: "Орехи", u: "g", v: { kcal: 553, p: 18, f: 44, c: 30, zinc: 5.7, copper: 2.2, magnesium: 292 } },
  { id: "choco", n: "Шоколад 80%", t: "Снеки", u: "g", v: { kcal: 600, p: 8, f: 43, c: 30, magnesium: 230, iron: 11.9, zinc: 3, copper: 1 } },
  { id: "bacon", n: "Бекон, полоска", t: "Снеки", u: "pcs", w: 12, v: { kcal: 43, p: 3, f: 3.5 } },
  { id: "bone", n: "Костный бульон", t: "Снеки", u: "g", v: { kcal: 15, p: 3, collagen: 2.5 } }
];
const CAT_TAGS = ["Все", "Мои", "Белок", "Гарнир", "Овощи и фрукты", "Молочное", "Орехи", "Снеки"];

const DOMAINS = { mind: "РАЗУМ", art: "ТВОРЧЕСТВО", body: "ТЕЛО", will: "ВОЛЯ" };

const DEF_SKILLS = [
  { id: "thai", name: "Тайский язык", domain: "mind", base: 0, norm: 4, active: true },
  { id: "sqlpy", name: "SQL и Python", domain: "mind", base: 0, norm: 4, active: true },
  { id: "pencil", name: "Рисование карандашом", domain: "art", base: 0, norm: 4, active: true },
  { id: "vocal", name: "Пение", domain: "art", base: 0, norm: 4, active: false },
  { id: "guitar", name: "Гитара", domain: "art", base: 0, norm: 4, active: false },
  { id: "tablet2d", name: "Рисование на планшете, 2D", domain: "art", base: 0, norm: 4, active: false },
  { id: "aivideo", name: "AI-видео", domain: "art", base: 0, norm: 4, active: false },
  { id: "script", name: "Сценаристика", domain: "art", base: 0, norm: 4, active: false },
  { id: "eng", name: "Английский язык", domain: "mind", base: 20, norm: 4, active: true },
  { id: "mops", name: "Marketing Ops", domain: "mind", base: 20, norm: 4, active: true }
];
const DEF_REWARDS = [
  { id: "r1", title: "Платье до 500 ฿ на Lazada", cond: { type: "streak", value: 7 }, claimed: false },
  { id: "r2", title: "Приз до 2000 ฿ — выбрать самой", cond: { type: "days", value: 25 }, claimed: false },
  { id: "r3", title: "Новый ноутбук", cond: { type: "days", value: 70 }, claimed: false }
];
const COND_L = { streak: "дней подряд", days: "активных дней всего", hours: "часов навыков", level: "уровень охотника" };

const TABS = [
  { id: "status", label: "Статус", Icon: Shield },
  { id: "today", label: "День", Icon: Flame },
  { id: "skills", label: "Навыки", Icon: Swords },
  { id: "quests", label: "Квесты", Icon: ScrollText },
  { id: "stats", label: "Итоги", Icon: BarChart3 },
  { id: "more", label: "Ещё", Icon: Settings }
];

const emptyDay = () => ({ food: [], pills: {}, sleep: "", water: 0, acts: [], mood: null, note: "", skills: [] });
const defCfg = () => ({
  hunter: "Рин",
  goals: { kcal: 1800, p: 100, f: 60, c: 180, water: 2000, sleep: 8 },
  pills: [], foods: [], skills: DEF_SKILLS, quests: [], rewards: DEF_REWARDS
});

/* ═════════ система: опыт, уровни, ранги ═════════ */
const RANKS = [[55, "S"], [35, "A"], [20, "B"], [10, "C"], [5, "D"], [0, "E"]];
const rank = (lvl) => (RANKS.find((r) => lvl >= r[0]) || [0, "E"])[1];
const levelFromExp = (exp) => { let l = 1, need = 500, acc = 0; while (exp >= acc + need) { acc += need; l++; need = 500 + (l - 1) * 250; } return { level: l, into: exp - acc, need: need }; };
const skillLevel = (sk, hours) => sk.base + Math.floor(hours / 8);

const pillMicros = (day, cfg) => {
  const o = {}; MICROS.forEach((m) => (o[m.k] = 0));
  (cfg.pills || []).forEach((p) => { if (day.pills[p.id]) MICROS.forEach((m) => (o[m.k] += nn(p.micros && p.micros[m.k]))); });
  return o;
};
const dailyQuest = (day, cfg) => {
  const skMin = (day.skills || []).reduce((a, s) => a + nn(s.min), 0);
  const mins = (day.acts || []).reduce((a, s) => a + nn(s.min), 0);
  const q = [
    { k: "water", l: "Норма воды", ok: (day.water || 0) >= cfg.goals.water },
    { k: "sleep", l: "Сон " + (cfg.goals.sleep - 1) + "+ часов", ok: nn(day.sleep) >= cfg.goals.sleep - 1 },
    { k: "move", l: "20 минут движения", ok: mins >= 20 },
    { k: "skill", l: "30 минут навыка", ok: skMin >= 30 },
    { k: "food", l: "Еда записана", ok: (day.food || []).length > 0 }
  ];
  /* пункт про добавки есть, только если добавки заведены — иначе квест нельзя закрыть */
  if ((cfg.pills || []).length > 0) {
    q.push({ k: "pills", l: "Добавки приняты", ok: cfg.pills.every((p) => day.pills[p.id]) });
  }
  return q;
};
const rollup = (day, cfg) => {
  const t = {}; NUTRI.forEach((k) => (t[k] = 0));
  (day.food || []).forEach((x) => NUTRI.forEach((k) => (t[k] += nn(x[k]))));
  const pm = pillMicros(day, cfg); const mic = {};
  MICROS.forEach((m) => (mic[m.k] = r1(t[m.k] + pm[m.k])));
  const sk = {}; const exp = { mind: 0, art: 0, body: 0, will: 0 };
  (day.skills || []).forEach((s) => {
    sk[s.skillId] = (sk[s.skillId] || 0) + nn(s.min);
    const def = (cfg.skills || []).find((x) => x.id === s.skillId);
    const dom = def ? def.domain : "mind";
    exp[dom] += Math.round((nn(s.min) / 60) * 150);
  });
  const q = dailyQuest(day, cfg); const qDone = q.filter((x) => x.ok).length;
  const ok = (k) => q.some((x) => x.k === k && x.ok);
  if (ok("water")) exp.body += 15;
  if (ok("sleep")) exp.body += 15;
  if (ok("move")) exp.body += 15;
  if (ok("food")) exp.body += 10;
  if (ok("pills")) exp.body += 10;
  if (day.mood) exp.will += 10;
  if (qDone === q.length) exp.will += 50;
  const expTotal = exp.mind + exp.art + exp.body + exp.will;
  return {
    kcal: Math.round(t.kcal), p: Math.round(t.p), fat: Math.round(t.f), c: Math.round(t.c), mic,
    burn: Math.round((day.acts || []).reduce((a, x) => a + nn(x.kcal), 0)),
    mins: Math.round((day.acts || []).reduce((a, x) => a + nn(x.min), 0)),
    water: day.water || 0, sleep: nn(day.sleep), mood: day.mood == null ? null : day.mood,
    pills: Object.values(day.pills || {}).filter(Boolean).length, pillsTotal: (cfg.pills || []).length,
    sk, exp, expTotal, qDone, qTotal: q.length
  };
};

/* ═════════ AI ═════════ */
async function ask(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, messages: [{ role: "user", content: prompt }] })
  });
  const data = await res.json();
  const raw = (data.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}
const FOOD_PROMPT =
  "Ты парсер дневника питания. На вход свободный русский текст о съеденном. Верни ТОЛЬКО JSON-массив без пояснений. Элемент: " +
  '{"name":"","g":число,"kcal":число,"p":число,"f":число,"c":число,"zinc":,"iron":,"vitD":,"b12":,"iodine":,"magnesium":,"calcium":,"omega3":,"copper":,"collagen":,"potassium":,"b6":,"vitC":,"fiber":}. ' +
  "Микронутриент указывай только если он даёт больше 5% дневной нормы, остальные ставь 0. Витамин D в мкг, йод в мкг, омега-3 и коллаген в граммах. " +
  "Числа для всей порции, не на 100 г. Порцию не указали — возьми типичную и впиши в g. Текст: ";
const PLAN_PROMPT =
  "Ты разбиваешь учебный план на конкретные задания. Верни ТОЛЬКО JSON без пояснений: " +
  '{"title":"краткое название цели","tasks":[{"title":"задание одной строкой","hours":число часов}]}. ' +
  "От 5 до 15 заданий, по возрастанию сложности, каждое выполнимо за 1–6 часов. План: ";

/* ═════════ стили ═════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
.sl * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.sl {
  --bg: #05070F; --panel: #0C1426; --line: rgba(88,166,255,.22); --cy: #4FD8FF; --bl: #3B82F6;
  --ink: #DCE7FF; --muted: #7E90B4; --gold: #FFC24D; --red: #FF6B6B; --grn: #4ADE80;
  background:
    radial-gradient(1200px 500px at 50% -80px, rgba(59,130,246,.22), transparent 70%),
    radial-gradient(800px 400px at 100% 100%, rgba(79,216,255,.08), transparent 70%), var(--bg);
  color: var(--ink); min-height: 100vh; font-family: 'Exo 2', system-ui, sans-serif; font-size: 15px;
  line-height: 1.45; padding-bottom: 88px;
}
.sl .mono { font-family: 'JetBrains Mono', monospace; }
.sl .panel {
  background: linear-gradient(160deg, rgba(20,34,64,.92), rgba(9,15,30,.92));
  box-shadow: inset 0 0 0 1px var(--line), 0 0 24px rgba(59,130,246,.10);
  clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
  padding: 14px;
}
.sl .cap { font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: var(--cy); font-weight: 700; }
.sl h2 { font-size: 16px; font-weight: 700; margin: 0; letter-spacing: .06em; text-transform: uppercase; }
.sl .sub { font-size: 12.5px; color: var(--muted); }
.sl .big { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 42px; line-height: 1; color: #fff; }
.sl .mid { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 24px; line-height: 1; }
.sl .bar-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; background: rgba(5,7,15,.86); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line); }
.sl .wrap { padding: 12px; display: flex; flex-direction: column; gap: 12px; max-width: 640px; margin: 0 auto; }
.sl .row { display: flex; align-items: center; gap: 8px; }
.sl .between { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sl .track { height: 7px; background: rgba(255,255,255,.07); overflow: hidden; }
.sl .fill { height: 100%; transition: width .35s ease; box-shadow: 0 0 10px currentColor; }
.sl .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sl .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.sl .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.sl .cell { background: rgba(255,255,255,.04); box-shadow: inset 0 0 0 1px rgba(88,166,255,.14); padding: 8px 10px; }
.sl .cell .v { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 19px; }
.sl .cell .l { font-size: 10.5px; color: var(--muted); letter-spacing: .06em; text-transform: uppercase; }
.sl input, .sl textarea, .sl select { width: 100%; background: rgba(255,255,255,.05); border: 1px solid var(--line);
  color: var(--ink); padding: 9px 10px; font-family: inherit; font-size: 15px; outline: none; border-radius: 0; }
.sl textarea { resize: vertical; }
.sl input:focus, .sl textarea:focus { border-color: var(--cy); }
.sl label { font-size: 10.5px; color: var(--muted); display: block; margin-bottom: 3px; letter-spacing: .06em; text-transform: uppercase; }
.sl .btn { border: 1px solid var(--cy); background: rgba(79,216,255,.12); color: var(--cy); padding: 9px 14px;
  font-family: inherit; font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.sl .btn:hover { background: rgba(79,216,255,.22); }
.sl .btn.ghost { border-color: var(--line); color: var(--muted); background: transparent; }
.sl .btn.gold { border-color: var(--gold); color: var(--gold); background: rgba(255,194,77,.12); }
.sl .btn:disabled { opacity: .35; cursor: default; }
.sl .chip { border: 1px solid var(--line); background: rgba(255,255,255,.04); color: var(--ink); padding: 6px 11px;
  font-family: inherit; font-size: 13px; cursor: pointer; }
.sl .chip.on { border-color: var(--cy); color: var(--cy); background: rgba(79,216,255,.14); }
.sl .chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sl .item { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid rgba(88,166,255,.14); }
.sl .item:first-of-type { border-top: none; }
.sl .iconbtn { background: none; border: none; color: var(--muted); padding: 6px; cursor: pointer; }
.sl .iconbtn:hover { color: var(--cy); }
.sl .empty { color: var(--muted); font-size: 13.5px; padding: 4px 0; }
.sl .bars { display: flex; align-items: flex-end; gap: 4px; height: 80px; }
.sl .bars .col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 4px; height: 100%; }
.sl .bars .b { width: 100%; min-height: 2px; }
.sl .bars .t { font-size: 9px; color: var(--muted); }
.sl .nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9; display: flex;
  padding: 7px 6px calc(7px + env(safe-area-inset-bottom)); background: rgba(6,10,22,.96); border-top: 1px solid var(--line); }
.sl .nav button { flex: 1; background: none; border: none; cursor: pointer; color: var(--muted); display: flex;
  flex-direction: column; align-items: center; gap: 3px; padding: 5px 2px; font-size: 9.5px; font-family: inherit;
  letter-spacing: .06em; text-transform: uppercase; }
.sl .toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 96px; z-index: 20; max-width: 90%;
  background: rgba(10,20,40,.96); box-shadow: inset 0 0 0 1px var(--cy), 0 0 26px rgba(79,216,255,.35);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  padding: 10px 16px; font-size: 13px; color: var(--cy); text-align: center; animation: pop .25s ease; }
@keyframes pop { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
.sl .moodgrid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
.sl .moodgrid div { aspect-ratio: 1; box-shadow: inset 0 0 0 1px rgba(88,166,255,.14); }
.sl .spin { animation: sp 1s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .sl * { animation: none !important; transition: none !important; } }
`;

/* ═════════ мелочи ═════════ */
function Field({ label, value, onChange, ph, wide, type }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : "auto" }}>
      <label>{label}</label>
      <input type={type} value={value} placeholder={ph || ""} inputMode={type ? undefined : "decimal"}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
/* Числовое поле: держит набранный текст как есть («7.», пусто), а наружу отдаёт число */
function useNumText(value) {
  const [s, setS] = useState(String(value == null ? "" : value));
  useEffect(() => { if (nn(s) !== nn(value)) setS(String(value == null ? "" : value)); }, [value]);
  return [s, setS];
}
function NumField({ label, value, onCommit, wide }) {
  const [s, setS] = useNumText(value);
  return <Field label={label} value={s} wide={wide} onChange={(v) => { setS(v); onCommit(nn(v)); }} />;
}
function NumInput({ value, onCommit, style }) {
  const [s, setS] = useNumText(value);
  return <input style={style} value={s} inputMode="decimal" onChange={(e) => { setS(e.target.value); onCommit(nn(e.target.value)); }} />;
}
function Progress({ value, goal, hue }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return <div className="track"><div className="fill" style={{ width: pct + "%", background: hue, color: hue }} /></div>;
}
function Bars({ data, hue, unit }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="col" key={i} title={d.label + ": " + r1(d.v) + (unit || "")}>
          <div className="b" style={{ height: (d.v / max) * 100 + "%", background: d.v ? hue : "rgba(255,255,255,.07)" }} />
          <div className="t">{d.t}</div>
        </div>
      ))}
    </div>
  );
}
function Panel({ cap, right, children, style }) {
  return (
    <div className="panel" style={style}>
      {(cap || right) && <div className="between" style={{ marginBottom: 10 }}>
        <span className="cap">{cap}</span>{right}
      </div>}
      {children}
    </div>
  );
}


/* ═════════ выбор продукта из каталога ═════════ */
function FoodPicker({ cfg, day, saveDay }) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("Все");
  const [sel, setSel] = useState(null);
  const [amt, setAmt] = useState("");

  const mine = (cfg.foods || []).map((f) => ({ id: f.id, n: f.name, t: "Мои", u: "g", v: f.per100 }));
  const all = mine.concat(CATALOG);
  const list = all.filter((x) => (tag === "Все" || x.t === tag) &&
    (!q.trim() || x.n.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 10);

  const pick = (x) => { setSel(sel && sel.id === x.id ? null : x); setAmt(x.u === "pcs" ? "1" : "100"); };
  const add = () => {
    const a = nn(amt); if (!sel || a <= 0) return;
    const mult = sel.u === "pcs" ? a : a / 100;
    const e = { id: uid(), name: sel.n + (sel.u === "pcs" ? " ×" + a : ""), g: String(sel.u === "pcs" ? r1((sel.w || 0) * a) : a) };
    NUTRI.forEach((k) => (e[k] = r1(nn(sel.v[k]) * mult)));
    saveDay({ ...day, food: [...day.food, e] });
    setSel(null); setAmt(""); setQ("");
  };

  return (
    <div style={{ marginTop: 11 }}>
      <span className="cap">Каталог продуктов</span>
      <input style={{ marginTop: 7 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="поиск: яблоко, грудка, нори" />
      <div className="chips" style={{ marginTop: 7 }}>
        {CAT_TAGS.map((t) => (
          <button key={t} className={"chip" + (tag === t ? " on" : "")} onClick={() => setTag(t)}>{t}</button>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        {list.length === 0 && <div className="empty">Ничего не нашлось. Добавь вручную и сохрани «В базу».</div>}
        {list.map((x) => (
          <div key={x.id}>
            <div className="item">
              <button className="iconbtn" style={{ color: sel && sel.id === x.id ? "#4FD8FF" : "var(--muted)" }} onClick={() => pick(x)}>
                <Plus size={16} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }} onClick={() => pick(x)}>
                <div style={{ fontWeight: 600 }}>{x.n}</div>
                <div className="sub mono">
                  {x.u === "pcs" ? "1 шт" : "100 г"} · {Math.round(nn(x.v.kcal))} ккал · Б{r1(nn(x.v.p))}
                  {MICROS.filter((m) => nn(x.v[m.k]) > 0).slice(0, 2).map((m) => " · " + m.l + " " + r1(nn(x.v[m.k])) + m.u).join("")}
                </div>
              </div>
              <span className="sub">{x.t}</span>
            </div>
            {sel && sel.id === x.id && (
              <div className="row" style={{ paddingBottom: 9 }}>
                <input value={amt} inputMode="decimal" onChange={(e) => setAmt(e.target.value)}
                  placeholder={x.u === "pcs" ? "штук" : "граммов"} />
                <button className="btn" onClick={add}>Добавить</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════ СТАТУС ═════════ */
function StatusTab({ day, cfg, summary, date, saveCfg, go, stats }) {
  const q = dailyQuest(day, cfg);
  const done = q.filter((x) => x.ok).length;
  const lv = stats.lv;

  const check = (r) => {
    if (r.cond.type === "streak") return stats.streak >= r.cond.value;
    if (r.cond.type === "days") return stats.activeDays >= r.cond.value;
    if (r.cond.type === "hours") return stats.totalHours >= r.cond.value;
    return lv.level >= r.cond.value;
  };
  const progressOf = (r) => {
    const cur = r.cond.type === "streak" ? stats.streak : r.cond.type === "days" ? stats.activeDays
      : r.cond.type === "hours" ? r1(stats.totalHours) : lv.level;
    return cur + " / " + r.cond.value;
  };

  return (
    <>
      <Panel cap="Статус охотника" right={<span className="sub mono">РАНГ {rank(lv.level)}</span>}>
        <div className="between" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="sub">{cfg.hunter}</div>
            <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
              <span className="big">{lv.level}</span><span className="sub">уровень</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 13 }}>{lv.into} / {lv.need} EXP</div>
            <div className="sub">всего {stats.totalExp}</div>
          </div>
        </div>
        <div style={{ marginTop: 9 }}><Progress value={lv.into} goal={lv.need} hue="#4FD8FF" /></div>
        <div className="grid4" style={{ marginTop: 12 }}>
          {["body", "mind", "art", "will"].map((d) => (
            <div className="cell" key={d}>
              <div className="v">{stats.stat[d]}</div>
              <div className="l">{DOMAINS[d]}</div>
            </div>
          ))}
        </div>
        <div className="grid3" style={{ marginTop: 8 }}>
          <div className="cell"><div className="v">{stats.streak}</div><div className="l">дней подряд</div></div>
          <div className="cell"><div className="v">{stats.activeDays}</div><div className="l">активных дней</div></div>
          <div className="cell"><div className="v">{r1(stats.totalHours)}</div><div className="l">часов навыков</div></div>
        </div>
      </Panel>

      <Panel cap="Ежедневный квест" right={<span className="mono sub">{done} / {q.length}</span>}>
        {q.map((x) => (
          <div className="item" key={x.k}>
            <div style={{
              width: 22, height: 22, display: "grid", placeItems: "center",
              boxShadow: "inset 0 0 0 1px " + (x.ok ? "#4ADE80" : "rgba(88,166,255,.25)"),
              color: "#4ADE80", background: x.ok ? "rgba(74,222,128,.14)" : "transparent"
            }}>{x.ok ? <Check size={14} /> : null}</div>
            <div style={{ flex: 1, opacity: x.ok ? 1 : 0.65 }}>{x.l}</div>
          </div>
        ))}
        <div className="sub" style={{ marginTop: 8 }}>
          Невыполненное ничего не отнимает — система без штрафов. Полный сбор даёт бонус +50 EXP к воле.
        </div>
        <button className="btn" style={{ marginTop: 10, width: "100%" }} onClick={() => go("today")}>Открыть день</button>
      </Panel>

      <Panel cap="Награды" right={<Gift size={16} color="#FFC24D" />}>
        {cfg.rewards.map((r) => {
          const un = check(r);
          return (
            <div className="item" key={r.id}>
              <div style={{ color: r.claimed ? "#4ADE80" : un ? "#FFC24D" : "var(--muted)" }}>
                {r.claimed ? <Check size={18} /> : un ? <Gift size={18} /> : <Lock size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, textDecoration: r.claimed ? "line-through" : "none" }}>{r.title}</div>
                <div className="sub mono">{progressOf(r)} {COND_L[r.cond.type]}</div>
              </div>
              {un && !r.claimed && (
                <button className="btn gold" onClick={() => saveCfg({
                  ...cfg, rewards: cfg.rewards.map((x) => (x.id === r.id ? { ...x, claimed: true } : x))
                })}>Забрать</button>
              )}
            </div>
          );
        })}
        <div className="sub" style={{ marginTop: 8 }}>Условия и призы правятся во вкладке «Ещё».</div>
      </Panel>
    </>
  );
}

/* ═════════ ДЕНЬ ═════════ */
function TodayTab({ day, cfg, summary, date, saveDay, saveCfg, toast }) {
  const [txt, setTxt] = useState(""); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(""); const [draft, setDraft] = useState([]);
  const [manual, setManual] = useState(false); const [micro, setMicro] = useState(false);
  const blank = { name: "", g: "" }; NUTRI.forEach((k) => (blank[k] = ""));
  const [form, setForm] = useState(blank);
  const [act, setAct] = useState({ type: "", min: "" });

  const tot = useMemo(() => {
    const t = { kcal: 0, p: 0, f: 0, c: 0 };
    day.food.forEach((x) => Object.keys(t).forEach((k) => (t[k] += nn(x[k]))));
    return t;
  }, [day.food]);

  /* Недобор с прошлых дней недели переносится на сегодня. День без записей еды
     считается как съеденная норма (иначе цель раздувается), а сама цель держится в коридоре 50–130% нормы. */
  const ws = weekStart(date); const idx = daysBetween(ws, date);
  const before = lastN(idx, shiftD(date, -1)).map((d) => summary[d] || {});
  const spent = (k, base) => before.reduce((a, x) => a + (nn(x[k]) > 0 ? nn(x[k]) : base), 0);
  const goalToday = (k, base) => Math.round(Math.min(base * 1.3, Math.max(base * 0.5, (base * 7 - spent(k, base)) / (7 - idx))));
  const gKcal = goalToday("kcal", cfg.goals.kcal);

  const parse = async () => {
    if (!txt.trim()) return; setBusy(true); setErr("");
    try {
      const arr = await ask(FOOD_PROMPT + txt);
      setDraft((Array.isArray(arr) ? arr : arr.items || []).map((x) => {
        const e = { id: uid(), name: String(x.name || "Блюдо"), g: x.g == null ? "" : String(x.g) };
        NUTRI.forEach((k) => (e[k] = nn(x[k]))); return e;
      }));
    } catch (e) { setErr("Разбор не удался. Попробуй ещё раз или добавь вручную."); }
    setBusy(false);
  };
  const addManual = () => {
    if (!form.name.trim() && !nn(form.kcal)) return;
    const e = { id: uid(), name: form.name.trim() || "Без названия", g: form.g };
    NUTRI.forEach((k) => (e[k] = form[k]));
    saveDay({ ...day, food: [...day.food, e] }); setForm(blank); setManual(false);
  };
  const addAct = () => {
    if (!act.type.trim() && !nn(act.min)) return;
    const m = METS.find((x) => x.l === act.type);
    const kcal = m && nn(act.min) ? Math.round((m.met * 3.5 * 65 / 200) * nn(act.min)) : "";
    const prevMin = day.acts.reduce((a, x) => a + nn(x.min), 0);
    saveDay({ ...day, acts: [...day.acts, { id: uid(), type: act.type || "Активность", min: act.min, kcal: String(kcal) }] });
    setAct({ type: "", min: "" });
    toast(prevMin < 20 && prevMin + nn(act.min) >= 20 ? "Квест «20 минут движения» выполнен · +15 EXP к телу" : "Движение записано");
  };
  const mic = rollup(day, cfg).mic;
  const burn = day.acts.reduce((a, x) => a + nn(x.kcal), 0);
  const takenPills = cfg.pills.filter((p) => day.pills[p.id]).length;

  return (
    <>
      <Panel cap="Питание" right={<span className="sub mono">{Math.round(tot.kcal)} / {gKcal}</span>}>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="big">{Math.max(0, gKcal - Math.round(tot.kcal))}</span>
          <span className="sub">ккал осталось{burn ? " · сожжено " + Math.round(burn) : ""}</span>
        </div>
        <div style={{ marginTop: 9 }}><Progress value={tot.kcal} goal={gKcal} hue="#FFC24D" /></div>
        <div className="grid3" style={{ marginTop: 11 }}>
          <div className="cell"><div className="v">{Math.round(tot.p)}</div><div className="l">белки</div></div>
          <div className="cell"><div className="v">{Math.round(tot.f)}</div><div className="l">жиры</div></div>
          <div className="cell"><div className="v">{Math.round(tot.c)}</div><div className="l">углеводы</div></div>
        </div>
        <textarea rows={2} style={{ marginTop: 11 }} value={txt} onChange={(e) => setTxt(e.target.value)}
          placeholder="грудка 180 г, рис, салат с маслом" />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={parse} disabled={busy || !txt.trim()}>
            {busy ? <Loader size={15} className="spin" /> : <Sparkles size={15} />}{busy ? "Считаю" : "Разобрать"}
          </button>
          <button className="btn ghost" onClick={() => setManual(!manual)}>Вручную</button>
        </div>
        {err && <div className="sub" style={{ marginTop: 8, color: "var(--red)" }}>{err}</div>}

        {draft.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span className="cap">Подтверди</span>
            {draft.map((d) => (
              <div className="item" key={d.id}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{d.name}{nn(d.g) ? " · " + r1(nn(d.g)) + " г" : ""}</div>
                  <div className="sub mono">{Math.round(nn(d.kcal))} ккал · Б{r1(nn(d.p))} Ж{r1(nn(d.f))} У{r1(nn(d.c))}</div>
                </div>
                <button className="iconbtn" onClick={() => setDraft(draft.filter((x) => x.id !== d.id))}><X size={16} /></button>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 8, width: "100%" }}
              onClick={() => { saveDay({ ...day, food: [...day.food, ...draft] }); setDraft([]); setTxt(""); toast("Записано в дневник"); }}>
              Записать
            </button>
          </div>
        )}

        {manual && (
          <div style={{ marginTop: 10 }}>
            <div className="grid2">
              <Field label="Название" value={form.name} onChange={(v) => setForm({ ...form, name: v })} wide />
              <Field label="Граммы" value={form.g} onChange={(v) => setForm({ ...form, g: v })} />
              <Field label="Ккал" value={form.kcal} onChange={(v) => setForm({ ...form, kcal: v })} />
              <Field label="Белки" value={form.p} onChange={(v) => setForm({ ...form, p: v })} />
              <Field label="Жиры" value={form.f} onChange={(v) => setForm({ ...form, f: v })} />
              <Field label="Углеводы" value={form.c} onChange={(v) => setForm({ ...form, c: v })} wide />
            </div>
            <button className="chip" style={{ marginTop: 8 }} onClick={() => setMicro(!micro)}>
              {micro ? "Скрыть микро" : "Микронутриенты"}
            </button>
            {micro && <div className="grid2" style={{ marginTop: 8 }}>
              {MICROS.map((m) => <Field key={m.k} label={m.l + ", " + m.u} value={form[m.k]} onChange={(v) => setForm({ ...form, [m.k]: v })} />)}
            </div>}
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={addManual}>Добавить</button>
              <button className="btn ghost" disabled={!form.name.trim() || nn(form.g) <= 0} onClick={() => {
                const g = nn(form.g); const per100 = {};
                NUTRI.forEach((k) => (per100[k] = r1((nn(form[k]) / g) * 100)));
                saveCfg({ ...cfg, foods: [...cfg.foods, { id: uid(), name: form.name.trim(), per100 }] });
              }}>В базу</button>
            </div>
          </div>
        )}

        <FoodPicker cfg={cfg} day={day} saveDay={saveDay} />

        <div style={{ marginTop: 10 }}>
          {day.food.map((x) => (
            <div className="item" key={x.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{x.name}{nn(x.g) ? " · " + r1(nn(x.g)) + " г" : ""}</div>
                <div className="sub mono">{Math.round(nn(x.kcal))} ккал · Б{r1(nn(x.p))} Ж{r1(nn(x.f))} У{r1(nn(x.c))}</div>
              </div>
              <button className="iconbtn" onClick={() => saveDay({ ...day, food: day.food.filter((f) => f.id !== x.id) })}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel cap="Микронутриенты">
        {[1, 2, 3].map((p) => (
          <div key={p} style={{ marginBottom: 10 }}>
            <div className="sub" style={{ marginBottom: 4 }}>{PRI[p]}</div>
            {MICROS.filter((m) => m.p === p).map((m) => {
              const v = nn(mic[m.k]); const pct = (v / m.rda) * 100;
              const hue = pct >= 100 ? "#4ADE80" : pct >= 60 ? "#FFC24D" : "#FF6B6B";
              return (
                <div key={m.k} style={{ padding: "5px 0" }}>
                  <div className="between" style={{ fontSize: 12.5 }}>
                    <span>{m.l}</span><span className="sub mono">{r1(v)} / {m.rda} {m.u}</span>
                  </div>
                  <div style={{ marginTop: 3 }}><Progress value={v} goal={m.rda} hue={hue} /></div>
                </div>
              );
            })}
          </div>
        ))}
      </Panel>

      <Panel cap="Вода" right={<span className="sub mono">{(day.water / 1000).toFixed(2)} / {(cfg.goals.water / 1000).toFixed(1)} л</span>}>
        <Progress value={day.water} goal={cfg.goals.water} hue="#4FD8FF" />
        <div className="row" style={{ marginTop: 10 }}>
          {[200, 250, 500].map((n) => (
            <button key={n} className="btn" style={{ flex: 1 }} onClick={() => saveDay({ ...day, water: day.water + n })}>+{n}</button>
          ))}
          <button className="btn ghost" onClick={() => saveDay({ ...day, water: Math.max(0, day.water - 250) })}><Minus size={15} /></button>
        </div>
      </Panel>

      <Panel cap="Добавки" right={<span className="sub mono">{takenPills} / {cfg.pills.length}</span>}>
        {cfg.pills.length === 0 && <div className="empty">Добавь препараты во вкладке «Ещё» — они пойдут в микронутриенты.</div>}
        {cfg.pills.map((p) => {
          const on = !!day.pills[p.id];
          return (
            <div className="item" key={p.id}>
              <button className="iconbtn" style={{
                width: 26, height: 26, display: "grid", placeItems: "center", color: on ? "#4FD8FF" : "var(--muted)",
                boxShadow: "inset 0 0 0 1px " + (on ? "#4FD8FF" : "rgba(88,166,255,.25)"),
                background: on ? "rgba(79,216,255,.14)" : "transparent"
              }} onClick={() => saveDay({ ...day, pills: { ...day.pills, [p.id]: !on } })}>{on ? <Check size={15} /> : null}</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: on ? 700 : 400 }}>{p.name}</div>
                {p.dose && <div className="sub">{p.dose}</div>}
              </div>
              <Pill size={15} color="#7E90B4" />
            </div>
          );
        })}
      </Panel>

      <Panel cap="Движение" right={<span className="sub mono">{Math.round(burn)} ккал</span>}>
        <div className="chips">
          {METS.map((m) => (
            <button key={m.l} className={"chip" + (act.type === m.l ? " on" : "")}
              onClick={() => setAct({ ...act, type: act.type === m.l ? "" : m.l })}>{m.l}</button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 9 }}>
          <input value={act.min} inputMode="decimal" placeholder="минут" onChange={(e) => setAct({ ...act, min: e.target.value })} />
          <button className="btn" onClick={addAct}><Plus size={15} /></button>
        </div>
        {day.acts.map((a) => (
          <div className="item" key={a.id}>
            <Flame size={15} color="#FFC24D" />
            <div style={{ flex: 1 }}>{a.type} <span className="sub mono">· {r1(nn(a.min))} мин · {Math.round(nn(a.kcal))} ккал</span></div>
            <button className="iconbtn" onClick={() => saveDay({ ...day, acts: day.acts.filter((x) => x.id !== a.id) })}><Trash2 size={15} /></button>
          </div>
        ))}
      </Panel>

      <Panel cap="Сон" right={<span className="sub mono">цель {cfg.goals.sleep} ч</span>}>
        <div className="chips">
          {[5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((v) => (
            <button key={v} className={"chip" + (nn(day.sleep) === v ? " on" : "")}
              onClick={() => saveDay({ ...day, sleep: nn(day.sleep) === v ? "" : String(v) })}>{v}</button>
          ))}
          <input style={{ width: 72 }} value={day.sleep} inputMode="decimal" placeholder="свой"
            onChange={(e) => saveDay({ ...day, sleep: e.target.value })} />
        </div>
      </Panel>

      <Panel cap="Состояние" right={<span className="sub">{day.mood ? MOODS[day.mood - 1].l : "не отмечено"}</span>}>
        <div className="row" style={{ gap: 6 }}>
          {MOODS.map((m) => (
            <button key={m.v} className={"chip" + (day.mood === m.v ? " on" : "")} style={{ flex: 1, padding: "12px 0", fontWeight: 700 }}
              onClick={() => saveDay({ ...day, mood: day.mood === m.v ? null : m.v })}>{m.v}</button>
          ))}
        </div>
        <textarea rows={2} style={{ marginTop: 9 }} value={day.note} placeholder="заметка о дне"
          onChange={(e) => saveDay({ ...day, note: e.target.value })} />
      </Panel>
    </>
  );
}

/* ═════════ НАВЫКИ ═════════ */
function SkillsTab({ day, cfg, summary, date, saveDay, saveCfg, toast, hours }) {
  const [sel, setSel] = useState(null);
  const [min, setMin] = useState("");
  const [nsk, setNsk] = useState({ name: "", domain: "mind" });
  const [add, setAdd] = useState(false);

  const ws = weekStart(date);
  const idx = daysBetween(ws, date) + 1;
  const weekDays = lastN(idx, date);
  const weekMin = (id) => weekDays.reduce((a, d) => {
    const s = d === date ? null : summary[d];
    if (d === date) return a + (day.skills || []).filter((x) => x.skillId === id).reduce((b, x) => b + nn(x.min), 0);
    return a + (s && s.sk ? nn(s.sk[id]) : 0);
  }, 0);

  const active = cfg.skills.filter((s) => s.active);
  const load = active.reduce((a, s) => a + nn(s.norm), 0);

  const logSession = (id, m) => {
    if (!m) return;
    saveDay({ ...day, skills: [...(day.skills || []), { id: uid(), skillId: id, min: m }] });
    toast("+" + Math.round((m / 60) * 150) + " EXP · сессия засчитана");
    setMin(""); setSel(null);
  };

  return (
    <>
      <Panel cap="Панель навыков" right={<span className="sub mono">{active.length} в ротации · {load} ч/нед</span>}>
        <div className="sub">
          Норма 4 часа в неделю на трек. Десять треков сразу — это 40 часов в неделю, поэтому ротация:
          включаешь три-четыре, остальные спят и не мозолят глаза. Переключать можно в любой момент, прогресс не сгорает.
        </div>
        {load > 16 && <div className="sub" style={{ marginTop: 8, color: "var(--gold)" }}>
          Нагрузка {load} ч/нед — это много для параллельной работы. Реалистичный максимум: 12–16.
        </div>}
      </Panel>

      {cfg.skills.map((s) => {
        const totH = (hours[s.id] || 0) / 60;
        const lvl = skillLevel(s, totH);
        const wm = weekMin(s.id);
        const pct = s.norm > 0 ? Math.min(100, (wm / 60 / s.norm) * 100) : 0;
        const hue = s.domain === "mind" ? "#4FD8FF" : s.domain === "art" ? "#C77DFF" : "#4ADE80";
        return (
          <div className="panel" key={s.id} style={{ opacity: s.active ? 1 : 0.55 }}>
            <div className="between">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div className="sub mono">
                  УР. {lvl} · РАНГ {rank(lvl)} · {r1(totH)} ч всего{s.base ? " · старт middle+" : ""}
                </div>
              </div>
              <button className={"chip" + (s.active ? " on" : "")} onClick={() => saveCfg({
                ...cfg, skills: cfg.skills.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x))
              })}>{s.active ? "в ротации" : "спит"}</button>
            </div>
            <div style={{ marginTop: 9 }}><Progress value={wm / 60} goal={s.norm} hue={hue} /></div>
            <div className="between" style={{ marginTop: 5 }}>
              <span className="sub mono">{r1(wm / 60)} / {s.norm} ч на этой неделе</span>
              <span className="sub mono">{Math.round(pct)}%</span>
            </div>
            <div className="row" style={{ marginTop: 9 }}>
              {[15, 30, 60].map((m) => (
                <button key={m} className="btn ghost" style={{ flex: 1 }} onClick={() => logSession(s.id, m)}>+{m}м</button>
              ))}
              <button className="btn" onClick={() => setSel(sel === s.id ? null : s.id)}>...</button>
            </div>
            {sel === s.id && (
              <div className="row" style={{ marginTop: 8 }}>
                <input value={min} inputMode="decimal" placeholder="минут" onChange={(e) => setMin(e.target.value)} />
                <button className="btn" onClick={() => logSession(s.id, nn(min))}>Записать</button>
                <NumInput style={{ width: 80 }} value={s.norm}
                  onCommit={(v) => saveCfg({ ...cfg, skills: cfg.skills.map((x) => (x.id === s.id ? { ...x, norm: v } : x)) })} />
              </div>
            )}
          </div>
        );
      })}

      <Panel cap="Сессии за день">
        {(day.skills || []).length === 0 && <div className="empty">Сегодня сессий ещё не было.</div>}
        {(day.skills || []).map((x) => {
          const s = cfg.skills.find((k) => k.id === x.skillId);
          return (
            <div className="item" key={x.id}>
              <div style={{ flex: 1 }}>{s ? s.name : "Навык"} <span className="sub mono">· {r1(nn(x.min))} мин</span></div>
              <button className="iconbtn" onClick={() => saveDay({ ...day, skills: day.skills.filter((y) => y.id !== x.id) })}><Trash2 size={15} /></button>
            </div>
          );
        })}
      </Panel>

      <Panel cap="Новый навык" right={<button className="iconbtn" onClick={() => setAdd(!add)}>{add ? <X size={18} /> : <Plus size={18} />}</button>}>
        {add && (
          <>
            <div className="grid2">
              <Field label="Название" value={nsk.name} onChange={(v) => setNsk({ ...nsk, name: v })} wide />
            </div>
            <div className="chips" style={{ marginTop: 8 }}>
              {["mind", "art", "body"].map((d) => (
                <button key={d} className={"chip" + (nsk.domain === d ? " on" : "")} onClick={() => setNsk({ ...nsk, domain: d })}>{DOMAINS[d]}</button>
              ))}
            </div>
            <button className="btn" style={{ marginTop: 9, width: "100%" }} onClick={() => {
              if (!nsk.name.trim()) return;
              saveCfg({ ...cfg, skills: [...cfg.skills, { id: uid(), name: nsk.name.trim(), domain: nsk.domain, base: 0, norm: 4, active: true }] });
              setNsk({ name: "", domain: "mind" }); setAdd(false);
            }}>Добавить трек</button>
          </>
        )}
      </Panel>
    </>
  );
}


/* часы, вложенные в навык квеста с момента его старта */
const questHours = (q, summary, date) => {
  const n = Math.max(1, daysBetween(q.start, date) + 1);
  return lastN(n, date).reduce((a, d) => {
    const sk = (summary[d] || {}).sk || {};
    return a + nn(sk[q.skillId]);
  }, 0) / 60;
};

/* ═════════ КВЕСТЫ ═════════ */
function QuestsTab({ cfg, saveCfg, date, toast, summary }) {
  const [txt, setTxt] = useState(""); const [dl, setDl] = useState(shiftD(date, 60));
  const [skill, setSkill] = useState(cfg.skills[0] ? cfg.skills[0].id : "");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!txt.trim()) return; setBusy(true); setErr("");
    try {
      const res = await ask(PLAN_PROMPT + txt);
      const q = {
        id: uid(), title: res.title || "Новый квест", skillId: skill, deadline: dl, start: date,
        tasks: (res.tasks || []).map((t) => ({ id: uid(), title: t.title, hours: nn(t.hours) || 2, done: false }))
      };
      saveCfg({ ...cfg, quests: [...cfg.quests, q] });
      setTxt(""); setOpen(false); toast("Квест принят: " + q.title);
    } catch (e) { setErr("Не получилось разобрать план. Попробуй сформулировать проще."); }
    setBusy(false);
  };

  return (
    <>
      <Panel cap="Журнал квестов" right={<button className="iconbtn" onClick={() => setOpen(!open)}>{open ? <X size={18} /> : <Plus size={18} />}</button>}>
        <div className="sub">
          Загружаешь план обычным текстом — система режет его на задания с оценкой часов, привязывает к навыку и дедлайну.
          Дальше считает два процента: сколько сделано и сколько времени прошло. Отставание не штрафуется, просто видно,
          сколько часов в неделю нужно, чтобы успеть.
        </div>
        {open && (
          <div style={{ marginTop: 10 }}>
            <textarea rows={4} value={txt} onChange={(e) => setTxt(e.target.value)}
              placeholder="Например: выучить тайский до уровня бытового общения — алфавит, 500 слов, числа, еда, такси, диалоги" />
            <div className="grid2" style={{ marginTop: 8 }}>
              <div>
                <label>Навык</label>
                <select value={skill} onChange={(e) => setSkill(e.target.value)}>
                  {cfg.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <Field label="Дедлайн" type="date" value={dl} onChange={setDl} />
            </div>
            <button className="btn" style={{ marginTop: 9, width: "100%" }} onClick={load} disabled={busy || !txt.trim()}>
              {busy ? <Loader size={15} className="spin" /> : <Sparkles size={15} />}{busy ? "Разбираю план" : "Загрузить план"}
            </button>
            {err && <div className="sub" style={{ marginTop: 8, color: "var(--red)" }}>{err}</div>}
          </div>
        )}
      </Panel>

      {cfg.quests.length === 0 && <Panel cap="Пусто"><div className="empty">Активных квестов нет. Загрузи первый план.</div></Panel>}

      {cfg.quests.map((q) => {
        const totalH = q.tasks.reduce((a, t) => a + nn(t.hours), 0);
        const auto = q.mode !== "manual";
        const logged = questHours(q, summary, date);
        const doneH = auto ? Math.min(totalH, logged) : q.tasks.filter((t) => t.done).reduce((a, t) => a + nn(t.hours), 0);
        const pDone = totalH ? (doneH / totalH) * 100 : 0;
        const all = Math.max(1, daysBetween(q.start, q.deadline));
        const gone = Math.min(all, Math.max(0, daysBetween(q.start, date)));
        const pTime = (gone / all) * 100;
        const left = Math.max(0, all - gone);
        const perWeek = left > 0 ? r1(((totalH - doneH) / left) * 7) : r1(totalH - doneH);
        const diff = Math.round(pDone - pTime);
        const sk = cfg.skills.find((s) => s.id === q.skillId);
        let acc = 0;
        return (
          <div className="panel" key={q.id}>
            <div className="between">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{q.title}</div>
                <div className="sub mono">{sk ? sk.name : ""} · до {shortDate(q.deadline)} · осталось {left} дн.</div>
              </div>
              <button className="iconbtn" onClick={() => saveCfg({ ...cfg, quests: cfg.quests.filter((x) => x.id !== q.id) })}><Trash2 size={16} /></button>
            </div>

            <div className="chips" style={{ marginTop: 9 }}>
              <button className={"chip" + (auto ? " on" : "")} onClick={() => saveCfg({
                ...cfg, quests: cfg.quests.map((x) => (x.id === q.id ? { ...x, mode: "auto" } : x))
              })}>по часам</button>
              <button className={"chip" + (!auto ? " on" : "")} onClick={() => saveCfg({
                ...cfg, quests: cfg.quests.map((x) => (x.id === q.id ? { ...x, mode: "manual" } : x))
              })}>вручную</button>
              {auto && <span className="sub mono" style={{ alignSelf: "center" }}>записано {r1(logged)} из {r1(totalH)} ч</span>}
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="between sub mono" style={{ marginBottom: 3 }}><span>прогресс</span><span>{Math.round(pDone)}%</span></div>
              <Progress value={pDone} goal={100} hue="#4FD8FF" />
              <div className="between sub mono" style={{ margin: "7px 0 3px" }}><span>время</span><span>{Math.round(pTime)}%</span></div>
              <Progress value={pTime} goal={100} hue="#7E90B4" />
            </div>
            <div className="sub" style={{ marginTop: 8, color: diff >= 0 ? "var(--grn)" : "var(--gold)" }}>
              {diff >= 0 ? "Идёшь с опережением на " + diff + "%" : "Отставание " + Math.abs(diff) + "% · нужно " + perWeek + " ч в неделю"}
            </div>

            <div style={{ marginTop: 8 }}>
              {q.tasks.map((t) => {
                const before = acc; acc += nn(t.hours);
                const ok = auto ? logged >= acc : !!t.done;
                const inWork = auto && !ok && logged > before;
                return (
                  <div className="item" key={t.id}>
                    <button className="iconbtn" style={{
                      width: 22, height: 22, display: "grid", placeItems: "center", color: "#4ADE80",
                      boxShadow: "inset 0 0 0 1px " + (ok ? "#4ADE80" : inWork ? "#FFC24D" : "rgba(88,166,255,.25)"),
                      background: ok ? "rgba(74,222,128,.14)" : "transparent"
                    }} onClick={() => { if (!auto) saveCfg({
                      ...cfg, quests: cfg.quests.map((x) => x.id !== q.id ? x
                        : { ...x, tasks: x.tasks.map((y) => (y.id === t.id ? { ...y, done: !y.done } : y)) })
                    }); }}>{ok ? <Check size={13} /> : null}</button>
                    <div style={{ flex: 1, opacity: ok ? 0.55 : 1, textDecoration: ok ? "line-through" : "none" }}>
                      {t.title}
                      {inWork && <span className="sub mono"> · в работе {r1(logged - before)}/{t.hours} ч</span>}
                    </div>
                    <span className="sub mono">{t.hours}ч</span>
                  </div>
                );
              })}
            </div>
            {auto && <div className="sub" style={{ marginTop: 8 }}>
              Часы из вкладки «Навыки» списываются в задания по порядку. Не тот порядок — переключись на «вручную» и отмечай сама.
            </div>}
          </div>
        );
      })}
    </>
  );
}

/* ═════════ ИТОГИ ═════════ */
function StatsTab({ summary, cfg, date, meas, saveMeas, hours }) {
  const [period, setPeriod] = useState("week");
  const [openM, setOpenM] = useState(false);
  const blank = { date: date }; BODY.forEach((b) => (blank[b.k] = ""));
  const [form, setForm] = useState(blank);
  const n = period === "day" ? 1 : period === "week" ? 7 : 30;
  const days = lastN(n, date);
  const rows = days.map((d) => summary[d] || {});
  const sum = (k) => rows.reduce((a, x) => a + (nn(x[k]) || 0), 0);
  const avg = (k) => r1(sum(k) / n);
  const series = (k, div) => days.map((d) => ({ t: n > 14 ? "" : shortDate(d).slice(0, -3), label: d, v: (nn(summary[d] && summary[d][k]) || 0) / (div || 1) }));
  const skMin = (id) => days.reduce((a, d) => a + nn(summary[d] && summary[d].sk && summary[d].sk[id]), 0);
  const moodVals = rows.map((x) => x.mood).filter((x) => x != null);
  const moodAvg = moodVals.length ? r1(moodVals.reduce((a, b) => a + b, 0) / moodVals.length) : null;
  const sorted = meas.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = sorted[0], prev = sorted[1];
  const delta = (k) => (!last || !prev || !nn(last[k]) || !nn(prev[k])) ? null
    : ((nn(last[k]) - nn(prev[k]) > 0 ? "+" : "") + r1(nn(last[k]) - nn(prev[k])));
  const alpha = [0.2, 0.36, 0.55, 0.75, 1];

  return (
    <>
      <Panel cap="Сводка">
        <div className="chips">
          {[["day", "День"], ["week", "Неделя"], ["month", "Месяц"]].map(([id, l]) => (
            <button key={id} className={"chip" + (period === id ? " on" : "")} onClick={() => setPeriod(id)}>{l}</button>
          ))}
        </div>
        <div className="grid2" style={{ marginTop: 11 }}>
          <div className="cell"><div className="v">{Math.round(sum("expTotal"))}</div><div className="l">EXP за период</div></div>
          <div className="cell"><div className="v">{r1(days.reduce((a, d) => a + Object.values((summary[d] && summary[d].sk) || {}).reduce((b, m) => b + nn(m), 0), 0) / 60)}</div><div className="l">часов навыков</div></div>
          <div className="cell"><div className="v">{n === 1 ? sum("kcal") : avg("kcal")}</div><div className="l">ккал{n === 1 ? "" : "/день"}</div></div>
          <div className="cell"><div className="v">{avg("sleep")}</div><div className="l">сна, ч/день</div></div>
          <div className="cell"><div className="v">{r1(avg("water") / 1000)}</div><div className="l">воды, л/день</div></div>
          <div className="cell"><div className="v">{Math.round(sum("mins"))}</div><div className="l">минут движения</div></div>
          <div className="cell"><div className="v">{moodAvg == null ? "—" : moodAvg}</div><div className="l">настроение</div></div>
          <div className="cell"><div className="v">{Math.round(sum("qDone"))}</div><div className="l">пунктов квеста</div></div>
        </div>
      </Panel>

      <Panel cap="Часы по навыкам">
        {cfg.skills.filter((s) => skMin(s.id) > 0 || s.active).map((s) => (
          <div key={s.id} style={{ padding: "6px 0" }}>
            <div className="between" style={{ fontSize: 13 }}>
              <span>{s.name}</span>
              <span className="sub mono">{r1(skMin(s.id) / 60)} ч · всего {r1((hours[s.id] || 0) / 60)}</span>
            </div>
            <div style={{ marginTop: 3 }}><Progress value={skMin(s.id) / 60} goal={s.norm * (n / 7)} hue="#C77DFF" /></div>
          </div>
        ))}
      </Panel>

      {n > 1 && (
        <>
          <Panel cap="EXP по дням"><Bars data={series("expTotal")} hue="#4FD8FF" unit=" EXP" /></Panel>
          <Panel cap="Сон, часы"><Bars data={series("sleep")} hue="#3B82F6" unit=" ч" /></Panel>
          <Panel cap="Калории"><Bars data={series("kcal")} hue="#FFC24D" unit=" ккал" /></Panel>
        </>
      )}

      <Panel cap="Настроение, 30 дней" right={<span className="sub mono">{moodAvg || "—"}</span>}>
        <div className="moodgrid">
          {lastN(30, date).map((d) => {
            const m = summary[d] && summary[d].mood;
            return <div key={d} title={shortDate(d)} style={{ background: m ? "rgba(199,125,255," + alpha[m - 1] + ")" : "rgba(255,255,255,.04)" }} />;
          })}
        </div>
      </Panel>

      <Panel cap="Замеры" right={<button className="iconbtn" onClick={() => setOpenM(!openM)}>{openM ? <X size={18} /> : <Plus size={18} />}</button>}>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="mid">{last && nn(last.w) ? r1(nn(last.w)) : "—"}</span>
          <span className="sub">кг {delta("w") ? "· " + delta("w") : ""}</span>
        </div>
        {openM && (
          <>
            <div style={{ marginTop: 9 }}><Field label="Дата" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} /></div>
            <div className="grid2" style={{ marginTop: 8 }}>
              {BODY.map((b) => <Field key={b.k} label={b.l + ", " + b.u} value={form[b.k]} onChange={(v) => setForm({ ...form, [b.k]: v })} />)}
            </div>
            <button className="btn" style={{ marginTop: 9, width: "100%" }} onClick={() => {
              if (!BODY.some((b) => nn(form[b.k]) > 0)) return;
              const e = { id: uid(), date: form.date || date };
              BODY.forEach((b) => (e[b.k] = form[b.k]));
              saveMeas([...meas, e]); setForm({ ...blank, date: form.date }); setOpenM(false);
            }}>Сохранить замер</button>
          </>
        )}
        <div style={{ marginTop: 8 }}>
          {sorted.slice(0, 8).map((m) => (
            <div className="item" key={m.id}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{longDate(m.date)}</div>
                <div className="sub mono">{BODY.filter((b) => nn(m[b.k]) > 0).map((b) => b.l + " " + r1(nn(m[b.k]))).join(" · ")}</div>
              </div>
              <button className="iconbtn" onClick={() => saveMeas(meas.filter((x) => x.id !== m.id))}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

/* ═════════ ЕЩЁ ═════════ */
function MoreTab({ cfg, saveCfg, day, saveDay, summary, meas }) {
  const [p, setP] = useState({ name: "", dose: "" });
  const [pm, setPm] = useState({}); const [openMicro, setOpenMicro] = useState(false);
  const [rw, setRw] = useState({ title: "", type: "streak", value: "" });
  const [dump, setDump] = useState("");

  /* в копию попадают и все записи по дням, не только сводка */
  const backup = () => {
    const days = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(K("day:"))) days[k.slice(K("day:").length)] = JSON.parse(localStorage.getItem(k));
      }
    } catch (e) { console.error(e); }
    setDump(JSON.stringify({ cfg, summary, meas, days }, null, 1));
  };

  return (
    <>
      <Panel cap="Охотник">
        <Field label="Имя" value={cfg.hunter} onChange={(v) => saveCfg({ ...cfg, hunter: v })} wide type="text" />
        <div className="sub" style={{ marginTop: 8 }}>
          Уровень растёт от EXP: час навыка — 150 EXP, пункты дневного квеста — по 10–15, полный сбор — ещё 50.
          Ранги идут E → D → C → B → A → S, отдельно у охотника и у каждого навыка.
        </div>
      </Panel>

      <Panel cap="Награды">
        {cfg.rewards.map((r) => (
          <div className="item" key={r.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{r.title}</div>
              <div className="sub mono">{r.cond.value} {COND_L[r.cond.type]}{r.claimed ? " · получена" : ""}</div>
            </div>
            {r.claimed && <button className="iconbtn" onClick={() => saveCfg({
              ...cfg, rewards: cfg.rewards.map((x) => (x.id === r.id ? { ...x, claimed: false } : x))
            })}><X size={15} /></button>}
            <button className="iconbtn" onClick={() => saveCfg({ ...cfg, rewards: cfg.rewards.filter((x) => x.id !== r.id) })}><Trash2 size={15} /></button>
          </div>
        ))}
        <div className="grid2" style={{ marginTop: 10 }}>
          <Field label="Приз" value={rw.title} onChange={(v) => setRw({ ...rw, title: v })} wide type="text" />
          <Field label="Порог" value={rw.value} onChange={(v) => setRw({ ...rw, value: v })} />
          <div>
            <label>Условие</label>
            <select value={rw.type} onChange={(e) => setRw({ ...rw, type: e.target.value })}>
              {Object.keys(COND_L).map((k) => <option key={k} value={k}>{COND_L[k]}</option>)}
            </select>
          </div>
        </div>
        <button className="btn" style={{ marginTop: 9, width: "100%" }} onClick={() => {
          if (!rw.title.trim() || !nn(rw.value)) return;
          saveCfg({ ...cfg, rewards: [...cfg.rewards, { id: uid(), title: rw.title.trim(), cond: { type: rw.type, value: nn(rw.value) }, claimed: false }] });
          setRw({ title: "", type: "streak", value: "" });
        }}>Добавить награду</button>
      </Panel>

      <Panel cap="Цели по здоровью">
        <div className="grid2">
          {[["kcal", "Ккал"], ["p", "Белок, г"], ["f", "Жиры, г"], ["c", "Углеводы, г"], ["water", "Вода, мл"], ["sleep", "Сон, ч"]].map(([k, l]) => (
            <NumField key={k} label={l} value={cfg.goals[k]} onCommit={(v) => saveCfg({ ...cfg, goals: { ...cfg.goals, [k]: v } })} />
          ))}
        </div>
      </Panel>

      <Panel cap="Добавки">
        {cfg.pills.map((x) => (
          <div className="item" key={x.id}>
            <Pill size={16} color="#4FD8FF" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{x.name}</div>
              <div className="sub">{[x.dose, MICROS.filter((m) => x.micros && x.micros[m.k]).map((m) => m.l + " " + x.micros[m.k] + m.u).join(", ")].filter(Boolean).join(" · ")}</div>
            </div>
            <button className="iconbtn" onClick={() => saveCfg({ ...cfg, pills: cfg.pills.filter((y) => y.id !== x.id) })}><Trash2 size={15} /></button>
          </div>
        ))}
        <div className="grid2" style={{ marginTop: 10 }}>
          <Field label="Название" value={p.name} onChange={(v) => setP({ ...p, name: v })} type="text" />
          <Field label="Дозировка" value={p.dose} onChange={(v) => setP({ ...p, dose: v })} type="text" />
        </div>
        <button className="chip" style={{ marginTop: 8 }} onClick={() => setOpenMicro(!openMicro)}>{openMicro ? "Скрыть состав" : "Состав"}</button>
        {openMicro && <div className="grid2" style={{ marginTop: 8 }}>
          {MICROS.map((m) => <Field key={m.k} label={m.l + ", " + m.u} value={pm[m.k] || ""} onChange={(v) => setPm({ ...pm, [m.k]: v })} />)}
        </div>}
        <button className="btn" style={{ marginTop: 9, width: "100%" }} onClick={() => {
          if (!p.name.trim()) return;
          const micros = {}; MICROS.forEach((m) => { if (nn(pm[m.k])) micros[m.k] = nn(pm[m.k]); });
          saveCfg({ ...cfg, pills: [...cfg.pills, { id: uid(), name: p.name.trim(), dose: p.dose.trim(), micros }] });
          setP({ name: "", dose: "" }); setPm({}); setOpenMicro(false);
        }}>Добавить препарат</button>
      </Panel>

      <Panel cap="Мои продукты">
        {cfg.foods.length === 0 && <div className="empty">Пусто.</div>}
        {cfg.foods.map((f) => (
          <div className="item" key={f.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{f.name}</div>
              <div className="sub mono">на 100 г: {Math.round(nn(f.per100.kcal))} ккал</div>
            </div>
            <button className="iconbtn" onClick={() => saveCfg({ ...cfg, foods: cfg.foods.filter((x) => x.id !== f.id) })}><Trash2 size={15} /></button>
          </div>
        ))}
      </Panel>

      <Panel cap="Данные">
        <div className="row">
          <button className="btn ghost" style={{ flex: 1 }} onClick={backup}>Резервная копия</button>
          <button className="btn ghost" onClick={() => {
            if (window.confirm("Стереть все записи за этот день?")) saveDay(emptyDay());
          }}>Очистить день</button>
        </div>
        {dump && <textarea rows={6} style={{ marginTop: 8, fontSize: 11 }} value={dump} readOnly />}
      </Panel>
    </>
  );
}

/* ═════════ ПРИЛОЖЕНИЕ ═════════ */
export default function ZhitZhizn() {
  const [tab, setTab] = useState("status");
  const [date, setDate] = useState(todayISO());
  /* день хранится вместе со своей датой: пока новый день грузится, старый не показывается и не перезаписывается */
  const [dayRec, setDayRec] = useState(null);
  const day = dayRec && dayRec.d === date ? dayRec.v : null;
  const [cfg, setCfg] = useState(null);
  const [summary, setSummary] = useState({});
  const [meas, setMeas] = useState([]);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const toastT = useRef(null); const lvRef = useRef(null);
  const pending = useRef({}); const summaryRef = useRef({});

  const toast = (t) => {
    setMsg(t); clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setMsg(""), 2600);
  };

  useEffect(() => {
    (async () => {
      const [c, s, m] = await Promise.all([sget("cfg", null), sget("summary", {}), sget("meas", [])]);
      const base = defCfg();
      setCfg(c ? { ...base, ...c, goals: { ...base.goals, ...(c.goals || {}) } } : base);
      summaryRef.current = s || {};
      setSummary(s || {}); setMeas(m || []); setReady(true);
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = pending.current[date];
      const d = p ? p.next : await sget("day:" + date, null);
      if (alive) setDayRec({ d: date, v: { ...emptyDay(), ...(d || {}) } });
    })();
    return () => { alive = false; };
  }, [date]);

  /* у каждого дня свой отложенный таймер записи — правка одного дня не отменяет запись другого */
  const flush = (d) => {
    const p = pending.current[d]; if (!p) return;
    clearTimeout(p.t); delete pending.current[d];
    sset("day:" + d, p.next);
    const s = { ...summaryRef.current, [d]: rollup(p.next, p.cfg) };
    summaryRef.current = s; sset("summary", s); setSummary(s);
  };
  const saveDay = (next) => {
    const d = date;
    setDayRec({ d, v: next });
    const old = pending.current[d]; if (old) clearTimeout(old.t);
    pending.current[d] = { next, cfg, t: setTimeout(() => flush(d), 600) };
  };
  const saveCfg = (next) => { setCfg(next); sset("cfg", next); };
  const saveMeas = (next) => { setMeas(next); sset("meas", next); };

  /* при закрытии или сворачивании вкладки дописываем всё, что не успело сохраниться */
  useEffect(() => {
    const flushAll = () => Object.keys(pending.current).forEach(flush);
    const onHide = () => { if (document.visibilityState === "hidden") flushAll(); };
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", onHide);
    return () => { window.removeEventListener("pagehide", flushAll); document.removeEventListener("visibilitychange", onHide); };
  }, []);

  /* агрегаты системы */
  const liveSummary = useMemo(() => {
    if (!cfg || !day) return summary;
    return { ...summary, [date]: rollup(day, cfg) };
  }, [summary, day, cfg, date]);

  const stats = useMemo(() => {
    const keys = Object.keys(liveSummary);
    const stat = { mind: 0, art: 0, body: 0, will: 0 }; let totalExp = 0; let activeDays = 0;
    keys.forEach((k) => {
      const s = liveSummary[k]; if (!s) return;
      if (s.exp) ["mind", "art", "body", "will"].forEach((d) => (stat[d] += nn(s.exp[d])));
      totalExp += nn(s.expTotal);
      if (nn(s.expTotal) > 0) activeDays++;
    });
    let streak = 0; let cur = todayISO();
    if (!(liveSummary[cur] && liveSummary[cur].expTotal > 0)) cur = shiftD(cur, -1);
    while (liveSummary[cur] && liveSummary[cur].expTotal > 0) { streak++; cur = shiftD(cur, -1); }
    const hours = {};
    keys.forEach((k) => { const sk = (liveSummary[k] || {}).sk || {}; Object.keys(sk).forEach((id) => (hours[id] = (hours[id] || 0) + nn(sk[id]))); });
    const totalHours = Object.values(hours).reduce((a, b) => a + b, 0) / 60;
    return {
      stat: { mind: 1 + Math.floor(stat.mind / 400), art: 1 + Math.floor(stat.art / 400), body: 1 + Math.floor(stat.body / 400), will: 1 + Math.floor(stat.will / 400) },
      totalExp, activeDays, streak, hours, totalHours, lv: levelFromExp(totalExp)
    };
  }, [liveSummary]);

  useEffect(() => {
    if (!ready) return;
    if (lvRef.current != null && stats.lv.level > lvRef.current) toast("УРОВЕНЬ ПОВЫШЕН · " + stats.lv.level);
    lvRef.current = stats.lv.level;
  }, [stats.lv.level, ready]);

  if (!ready || !cfg) {
    return <div className="sl"><style dangerouslySetInnerHTML={{ __html: CSS }} /><div className="wrap"><div className="panel"><span className="cap">Система загружается…</span></div></div></div>;
  }

  return (
    <div className="sl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="bar-top">
        <button className="iconbtn" onClick={() => setDate(shiftD(date, -1))}><ChevronLeft size={21} /></button>
        <div style={{ textAlign: "center" }}>
          <div className="cap" style={{ fontSize: 10 }}>Жить жизнь</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{longDate(date)}</div>
        </div>
        <button className="iconbtn" onClick={() => setDate(shiftD(date, 1))} disabled={date >= todayISO()}
          style={{ opacity: date >= todayISO() ? 0.25 : 1 }}><ChevronRight size={21} /></button>
      </div>

      <div className="wrap">
        {!day && <div className="panel"><span className="cap">Загружаю день…</span></div>}
        {day && tab === "status" && <StatusTab day={day} cfg={cfg} summary={liveSummary} date={date} saveCfg={saveCfg} go={setTab} stats={stats} />}
        {day && tab === "today" && <TodayTab day={day} cfg={cfg} summary={liveSummary} date={date} saveDay={saveDay} saveCfg={saveCfg} toast={toast} />}
        {day && tab === "skills" && <SkillsTab day={day} cfg={cfg} summary={liveSummary} date={date} saveDay={saveDay} saveCfg={saveCfg} toast={toast} hours={stats.hours} />}
        {day && tab === "quests" && <QuestsTab cfg={cfg} saveCfg={saveCfg} date={date} toast={toast} summary={liveSummary} />}
        {day && tab === "stats" && <StatsTab summary={liveSummary} cfg={cfg} date={date} meas={meas} saveMeas={saveMeas} hours={stats.hours} />}
        {day && tab === "more" && <MoreTab cfg={cfg} saveCfg={saveCfg} day={day} saveDay={saveDay} summary={summary} meas={meas} />}
      </div>

      {msg && <div className="toast mono">[ СИСТЕМА ] {msg}</div>}

      <nav className="nav">
        {TABS.map((x) => {
          const on = x.id === tab; const Ic = x.Icon;
          return (
            <button key={x.id} onClick={() => setTab(x.id)}
              style={{ color: on ? "#4FD8FF" : "var(--muted)", background: on ? "rgba(79,216,255,.10)" : "transparent" }}>
              <Ic size={19} /><span>{x.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
