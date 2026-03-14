import { QRCodeSVG } from "qrcode.react";
import { forwardRef } from "react";
import type { Pantry } from "@/lib/pantries";

interface FlyerPreviewProps {
  title: string;
  language: string;
  pantries: Pantry[];
  qrValue: string;
}

const FlyerPreview = forwardRef<HTMLDivElement, FlyerPreviewProps>(
  ({ title, language, pantries, qrValue }, ref) => {
    const topPantries = pantries.slice(0, 2);
    const bottomPantries = pantries.slice(2, 4);

    return (
      <div
        ref={ref}
        className="bg-card tactical-border p-5 flex flex-col relative"
        style={{ minHeight: 500 }}
      >
        {/* Header */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-label text-xs tracking-widest">LEMONTREE.ORG</p>
              <div className="w-10 h-0.5 bg-primary mt-0.5" />
            </div>
            <span className="text-xs font-mono-tight text-muted-foreground">{language}</span>
          </div>
          <h2 className="font-display font-black text-2xl xl:text-3xl uppercase leading-[0.95] mt-2">
            {title || "FREE FOOD NEAR YOU"}
          </h2>
        </div>

        {/* Top 2 pantry blocks */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          {topPantries.length > 0
            ? topPantries.map((p, i) => <PantryBlock key={p.id} pantry={p} index={i + 1} />)
            : [1, 2].map((i) => <EmptyBlock key={i} index={i} />)}
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-2 my-1.5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-label text-[9px] tracking-widest">PICK UP LOCATIONS</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Bottom 2 pantry blocks */}
        <div className="grid grid-cols-2 gap-2 flex-1">
          {bottomPantries.length > 0
            ? bottomPantries.map((p, i) => <PantryBlock key={p.id} pantry={p} index={i + 3} />)
            : [3, 4].map((i) => <EmptyBlock key={i} index={i} />)}
        </div>

        {/* Watermark */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 -rotate-90 origin-center pointer-events-none">
          <span className="font-display font-black text-5xl uppercase opacity-[0.03] whitespace-nowrap">
            {title || "LEMONTREE"}
          </span>
        </div>

        {/* Info text */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="font-mono-tight text-[10px] text-foreground leading-snug font-semibold mb-1">
            Scan to view full details about each resource, including reviews and wait times!
          </p>
          <p className="font-mono-tight text-[9px] text-muted-foreground leading-snug">
            This flyer was generated on 03/10/2026. Free food resources change schedules &amp; requirements often. For up-to-date information and more access tools, visit:
          </p>
          <p className="font-mono-tight text-[10px] text-primary font-bold mt-0.5">foodhelpline.org</p>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between pt-2 mt-1">
          <div>
            <p className="text-label text-[9px] mb-0.5">SCAN FOR DETAILS</p>
            <p className="text-[9px] text-muted-foreground font-mono-tight">lemontree.org</p>
          </div>
          <QRCodeSVG
            value={qrValue}
            size={64}
            bgColor="transparent"
            fgColor="hsl(0, 0%, 4%)"
            level="M"
          />
        </div>
      </div>
    );
  }
);

FlyerPreview.displayName = "FlyerPreview";

function EmptyBlock({ index }: { index: number }) {
  return (
    <div className="tactical-border rounded-sm p-3 bg-secondary/30 flex items-center justify-center">
      <p className="text-muted-foreground text-xs font-mono-tight text-center">
        Select pantry #{index}
      </p>
    </div>
  );
}

function PantryBlock({ pantry, index }: { pantry: Pantry; index: number }) {
  return (
    <div className="tactical-border rounded-sm p-3 bg-secondary/30 flex flex-col">
      <div className="flex items-start gap-2 mb-2">
        <span className="font-mono-tight text-sm font-bold text-primary flex-shrink-0 mt-0.5">
          {String(index).padStart(2, "0")}
        </span>
        <p className="font-display font-bold text-sm uppercase leading-tight">{pantry.name}</p>
      </div>
      <p className="font-mono-tight text-xs text-muted-foreground mb-2">{pantry.address}</p>

      {/* Offerings */}
      <div className="flex flex-wrap gap-1 mb-2">
        {pantry.offerings.map((o) => (
          <span
            key={o}
            className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-sm"
          >
            {o}
          </span>
        ))}
      </div>

      {/* Schedule - fills remaining space */}
      <div className="space-y-0.5 mt-auto">
        {pantry.schedule.map((s) => (
          <p key={s.day} className="font-mono-tight text-xs text-foreground">
            <span className="font-bold">{s.day.slice(0, 3).toUpperCase()}</span>{" "}
            <span className="text-muted-foreground">{s.time}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export default FlyerPreview;
