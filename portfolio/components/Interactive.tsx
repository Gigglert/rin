"use client";
import { useState, type ReactNode } from "react";

/* Фильтр кейсов: прячет карточки, у которых category не совпадает с выбранной вкладкой */
export function CaseFilter({
  allLabel, filters, children,
}: { allLabel: string; filters: { id: string; label: string }[]; children: ReactNode }) {
  const [active, setActive] = useState("all");
  const tabs = [{ id: "all", label: allLabel }, ...filters];
  return (
    <div data-filter={active} className="case-filter">
      {filters.length > 0 && (
        <div className="tabs" role="group">
          {tabs.map(t => (
            <button key={t.id} className="tab" aria-pressed={active === t.id} onClick={() => setActive(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <style>{active === "all" ? "" : `.case-filter .case:not([data-cat="${active}"]){display:none}`}</style>
      {children}
    </div>
  );
}

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }).catch(() => {});
      }}
    >
      {copied ? done : label}
    </button>
  );
}
