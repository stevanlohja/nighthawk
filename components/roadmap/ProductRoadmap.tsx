import { Pill } from "@/components/ui/Badge";
import { PRODUCT_ROADMAP, RoadmapStatus } from "@/lib/roadmap/product-roadmap";

const STATUS: Record<RoadmapStatus, { label: string; cls: string }> = {
  planned: { label: "Planned", cls: "text-mn-muted border-mn-border" },
  "in-flight": { label: "In flight", cls: "text-mn-accent border-mn-accent/40" },
  delivered: { label: "Delivered", cls: "text-mn-ok border-mn-ok/40" },
};

/**
 * Static grid of Nighthawk product workstreams. Server-rendered — the data is
 * curated by hand in lib/roadmap/product-roadmap.ts: no client state, no
 * telemetry, no dates.
 */
export default function ProductRoadmap() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PRODUCT_ROADMAP.map((item) => {
          const status = STATUS[item.status];
          return (
            <article
              key={item.id}
              className={`bg-mn-surface border rounded-2xl p-5 flex flex-col gap-3 ${
                item.status === "delivered" ? "border-mn-ok/30" : "border-mn-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-mn-accent">
                  {item.codename}
                </span>
                <span className="flex items-center gap-1.5">
                  <Pill className="text-mn-muted border-mn-border">{item.area}</Pill>
                  <Pill className={status.cls}>{status.label}</Pill>
                </span>
              </div>
              <h2 className="text-base font-semibold text-mn-text">{item.title}</h2>
              <p className="text-sm text-mn-text-2 leading-relaxed">{item.summary}</p>
              {item.rationale && (
                <p className="mt-auto text-xs text-mn-muted leading-relaxed border-l-2 border-mn-accent/40 pl-3">
                  {item.rationale}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <p className="text-[11px] text-mn-muted leading-relaxed">
        This page is curated by hand: workstreams are intentions, not dated commitments, and
        nothing here is measured or projected by the dashboard. A status flips only when work
        actually starts — and only to Delivered once what shipped matches what is written here.
      </p>
    </>
  );
}