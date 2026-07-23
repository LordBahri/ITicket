import { useState } from "react";
import { Card } from "./ui/Card";
import type { ManualDef } from "../content/manual/types";

export function ManualViewer({ manual }: { manual: ManualDef }) {
  const [openLightbox, setOpenLightbox] = useState<string | null>(null);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">{manual.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{manual.description}</p>
      </div>

      <div className="flex items-start gap-6">
        <nav className="sticky top-4 hidden w-64 shrink-0 space-y-0.5 lg:block">
          {manual.sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm leading-snug text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          {manual.sections.map((section, sIndex) => (
            <Card key={section.id} id={section.id} className="scroll-mt-4 p-6">
              <h2 className="mb-1 text-base font-semibold text-slate-900">
                {sIndex + 1}. {section.title}
              </h2>
              {section.intro && <p className="mb-4 text-sm text-slate-600">{section.intro}</p>}
              <ol className="space-y-5">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700">{step.text}</p>
                      {step.image && (
                        <button
                          type="button"
                          onClick={() => setOpenLightbox(step.image!)}
                          className="mt-2.5 block overflow-hidden rounded-lg border border-slate-200 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                        >
                          <img src={step.image} alt={step.imageAlt ?? step.text} className="w-full max-w-2xl" loading="lazy" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </div>

      {openLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6"
          onClick={() => setOpenLightbox(null)}
        >
          <img src={openLightbox} alt="Capture d'écran agrandie" className="max-h-full max-w-5xl rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
