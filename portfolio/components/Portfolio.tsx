import type { ReactNode } from "react";
import { getContent, type Content, type Lang, type Link } from "@/lib/content";
import { CaseFilter, CopyButton } from "./Interactive";

/* Страница собирается из content/<lang>.yml. Порядок секций задаёт список `order` в том же файле. */

const TONE = { yellow: "a", blue: "b", green: "c", pink: "d" } as const;

const ICONS: Record<string, ReactNode> = {
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  growth: <path d="M4 18l5-6 4 3 7-9" />,
  bars: <path d="M6 19V11M12 19V5M18 19v-6" />,
  spark: <><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
};

const Arrow = () => <svg className="arrow" viewBox="0 0 10 10"><use href="#arr" /></svg>;

const isExternal = (href: string) => /^https?:\/\//.test(href);

function Btn({ link, fallback = "primary" }: { link: Link; fallback?: "primary" | "plain" }) {
  const ext = isExternal(link.href);
  return (
    <a
      className={`btn btn-${link.style ?? fallback}`}
      href={link.href}
      {...(ext ? { target: "_blank", rel: "noopener" } : {})}
    >
      {link.label}<Arrow />
    </a>
  );
}

function Head({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <div className="head">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {intro && <p>{intro}</p>}
    </div>
  );
}

/* ── Секции ── */

function Hero({ c }: { c: Content }) {
  const { hero } = c;
  const card = hero.card;
  return (
    <section className="hero">
      <div className="plane" aria-hidden="true"><i /><i /><i /></div>
      <div className="wrap">
        <div className="hero-copy">
          <h1>{hero.title}</h1>
          <p className="lead">{hero.lead}</p>
          {hero.buttons?.length ? (
            <div className="cta-row">
              {hero.buttons.map((b, i) => <Btn key={i} link={b} fallback={i === 0 ? "primary" : "plain"} />)}
            </div>
          ) : null}
        </div>
        {card && (
          <div className="visual">
            <div className="profile">
              <div className="profile-head">
                {card.photo
                  ? <img className="photo" src={card.photo} alt={card.name} />
                  : <span className="photo" aria-hidden="true">{card.initials}</span>}
                <div><b>{card.name}</b>{card.subtitle && <span>{card.subtitle}</span>}</div>
              </div>
              {card.facts?.length ? (
                <dl className="facts">
                  {card.facts.map((f, i) => <div key={i}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
                </dl>
              ) : null}
              {card.tags?.length ? (
                <div className="profile-tags">{card.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
              ) : null}
            </div>
            {hero.badge && (
              <div className="toast" aria-hidden="true">
                <span className="ic">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7.5l2.5 2.5L11 4" stroke="#1E8E5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div><b>{hero.badge.title}</b>{hero.badge.text}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Stats({ c }: { c: Content }) {
  const { items = [], companies = [] } = c.stats;
  return (
    <div className="stats-band white">
      <div className="wrap">
        {items.length > 0 && (
          <div className="stats">
            {items.map((s, i) => <div key={i}><b>{s.value}</b><span>{s.label}</span></div>)}
          </div>
        )}
        {companies.length > 0 && (
          <div className="logos">
            {companies.map(co => co.logo
              ? <img key={co.name} src={co.logo} alt={co.name} />
              : <span key={co.name}>{co.name}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function Experience({ c }: { c: Content }) {
  const e = c.experience;
  return (
    <section id="experience">
      <div className="wrap">
        <Head eyebrow={e.eyebrow} title={e.title} />
        <ol className="timeline">
          {e.jobs.map((j, i) => (
            <li className="job" key={i}>
              <time>{j.dates}{j.place && <small>{j.place}</small>}</time>
              <div>
                {j.logo && <img className="job-logo" src={j.logo} alt="" />}
                <h3>{j.role} · <span>{j.company}</span></h3>
                {j.about && <p className="job-about">{j.about}</p>}
                {j.points?.length ? <ul>{j.points.map((p, k) => <li key={k}>{p}</li>)}</ul> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Cases({ c }: { c: Content }) {
  const s = c.cases;
  return (
    <section id="cases" className="white">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        <CaseFilter allLabel={s.all_label ?? "All"} filters={s.filters ?? []}>
          <div className="cases">
            {s.items.map((it, i) => (
              <article className="case" key={i} data-cat={it.category} data-tone={TONE[it.color ?? "yellow"] ?? "a"}>
                <div>
                  {it.image && <img className="case-image" src={it.image} alt="" />}
                  <div className="case-top">
                    <span className="case-client">{it.client}</span>
                    <div className="case-big"><b>{it.big}</b>{it.big_label && <span>{it.big_label}</span>}</div>
                  </div>
                </div>
                <div className="case-body">
                  <h3>{it.title}</h3>
                  {it.steps?.length ? (
                    <dl className="steps">
                      {it.steps.map((st, k) => <div key={k}><dt>{st.label}</dt><dd>{st.text}</dd></div>)}
                    </dl>
                  ) : null}
                  {it.metrics?.length ? (
                    <div className="metrics">{it.metrics.map((m, k) => <div key={k}><b>{m.value}</b><span>{m.label}</span></div>)}</div>
                  ) : null}
                  {it.tags?.length ? <div className="tags">{it.tags.map(t => <span key={t} className="tag">{t}</span>)}</div> : null}
                  {it.link && (
                    <a className="link-arrow case-link" href={it.link.href} {...(isExternal(it.link.href) ? { target: "_blank", rel: "noopener" } : {})}>
                      {it.link.label}<Arrow />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </CaseFilter>
      </div>
    </section>
  );
}

function Skills({ c }: { c: Content }) {
  const s = c.skills;
  return (
    <section id="skills">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} />
        {s.groups?.length ? (
          <div className="skills">
            {s.groups.map((g, i) => (
              <div className="skill" key={i}>
                <span className="skill-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0A2540" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[g.icon ?? "target"] ?? ICONS.target}
                  </svg>
                </span>
                <h3>{g.title}</h3>
                <ul>{g.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
        ) : null}
        {s.tools?.length ? <div className="tools">{s.tools.map(t => <span key={t} className="tool">{t}</span>)}</div> : null}
      </div>
    </section>
  );
}

function Education({ c }: { c: Content }) {
  const s = c.education;
  return (
    <section id="education" className="white">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} />
        <div className="edu-grid">
          {s.items.map((it, i) => (
            <div className="edu-item" key={i}>
              {it.when && <time>{it.when}</time>}
              <b>{it.title}</b>
              {it.text && <span>{it.text}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Looking({ c }: { c: Content }) {
  const s = c.looking;
  return (
    <section id="looking" className="dark">
      <div className="wrap">
        <Head eyebrow={s.eyebrow} title={s.title} intro={s.intro} />
        <div className="services">
          {s.cards.map((card, i) => (
            <div className={`service${card.featured ? " featured" : ""}`} key={i}>
              {card.badge && <span className="badge">{card.badge}</span>}
              <h3>{card.title}</h3>
              <ul>{card.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ c }: { c: Content }) {
  const s = c.contact;
  return (
    <section id="contact">
      <div className="wrap">
        <div className="contact-card">
          <div>
            {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
            <h2>{s.title}</h2>
            {s.text && <p>{s.text}</p>}
          </div>
          <div>
            {s.rows.map((r, i) => (
              <div className="contact-row" key={i}>
                <div>
                  <small>{r.label}</small>
                  {r.href
                    ? <a href={r.href} {...(isExternal(r.href) ? { target: "_blank", rel: "noopener" } : {})}>{r.value}</a>
                    : <strong>{r.value}</strong>}
                </div>
                {r.copy && <CopyButton text={r.value} label={s.copy_label} done={s.copied_label} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SECTIONS: Record<string, (p: { c: Content }) => JSX.Element> = {
  hero: Hero, stats: Stats, experience: Experience, cases: Cases,
  skills: Skills, education: Education, looking: Looking, contact: Contact,
};

export default function Portfolio({ lang }: { lang: Lang }) {
  const c = getContent(lang);
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <symbol id="arr" viewBox="0 0 10 10">
          <path className="line" d="M0 5h7" stroke="currentColor" strokeWidth="1.6" fill="none" />
          <path className="tip" d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </symbol>
      </svg>

      <header className="top">
        <div className="wrap">
          <a className="logo" href="#top">{c.site.name}</a>
          <nav className="nav">
            {c.nav.map(n => <a key={n.href} href={n.href}>{n.label}</a>)}
          </nav>
          <div className="top-right">
            <div className="lang">
              <a href="/" aria-current={lang === "en"}>EN</a>
              <a href="/ru" aria-current={lang === "ru"}>RU</a>
            </div>
            {c.header_button && <Btn link={c.header_button} />}
          </div>
        </div>
      </header>

      <main id="top">
        {c.order.map(key => {
          const Section = SECTIONS[key];
          return Section ? <Section key={key} c={c} /> : null;
        })}
      </main>

      <footer>
        <div className="wrap"><span>{c.site.footer_left}</span><span>{c.site.footer_right}</span></div>
      </footer>
    </>
  );
}
