import fs from "fs";
import path from "path";
import yaml from "js-yaml";

/* ── Типы контента. Все тексты сайта лежат в content/en.yml и content/ru.yml ── */
export type Lang = "en" | "ru";
export type Link = { label: string; href: string; style?: "primary" | "plain" };
export type LabelValue = { label: string; value: string };

export type Content = {
  site: { name: string; title: string; description: string; footer_left: string; footer_right: string };
  order: string[];
  nav: Link[];
  header_button?: Link;
  hero: {
    title: string;
    lead: string;
    buttons?: Link[];
    card?: {
      photo?: string;
      initials?: string;
      name: string;
      subtitle?: string;
      facts?: LabelValue[];
      tags?: string[];
    };
    badge?: { title: string; text?: string };
  };
  stats: { items?: { value: string; label: string }[]; companies?: { name: string; logo?: string }[] };
  experience: {
    eyebrow?: string;
    title: string;
    jobs: { role: string; company: string; dates: string; place?: string; about?: string; logo?: string; points?: string[] }[];
  };
  cases: {
    eyebrow?: string;
    title: string;
    intro?: string;
    all_label?: string;
    filters?: { id: string; label: string }[];
    items: {
      category?: string;
      color?: "yellow" | "blue" | "green" | "pink";
      image?: string;
      client: string;
      big: string;
      big_label?: string;
      title: string;
      steps?: { label: string; text: string }[];
      metrics?: { value: string; label: string }[];
      tags?: string[];
      link?: Link;
    }[];
  };
  skills: {
    eyebrow?: string;
    title: string;
    groups?: { icon?: "target" | "growth" | "bars" | "spark"; title: string; items: string[] }[];
    tools?: string[];
  };
  education: { eyebrow?: string; title: string; items: { when?: string; title: string; text?: string }[] };
  looking: {
    eyebrow?: string;
    title: string;
    intro?: string;
    cards: { title: string; badge?: string; featured?: boolean; items: string[] }[];
  };
  contact: {
    eyebrow?: string;
    title: string;
    text?: string;
    copy_label: string;
    copied_label: string;
    rows: { label: string; value: string; href?: string; copy?: boolean }[];
  };
};

export function getContent(lang: Lang): Content {
  const file = path.join(process.cwd(), "content", `${lang}.yml`);
  return yaml.load(fs.readFileSync(file, "utf8")) as Content;
}
