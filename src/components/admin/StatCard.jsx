import React, { useEffect, useRef, useState } from "react";

const DOTS = [
  [14, 14], [38, 14], [62, 14], [86, 14],
  [38, 38], [62, 38], [86, 38],
  [62, 62], [86, 62],
  [86, 86],
];
const DOT_DELAYS = [0.54, 0.36, 0.18, 0, 0.54, 0.36, 0.18, 0.54, 0.36, 0.54];

function fmt(v, decimals) {
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}
function numberSizing(str) {
  const len = str.length;
  const cqw = Math.round(155 / len);
  let capRem;
  if (len <= 3) capRem = 5.5;
  else if (len <= 4) capRem = 5;
  else if (len <= 5) capRem = 4.3;
  else if (len <= 6) capRem = 3.7;
  else if (len <= 8) capRem = 3;
  else capRem = 2.4;
  const sufCqw = Math.max(4, Math.round(cqw * 0.34));
  return { cqw, capRem, sufCqw };
}

export default function StatCard({ title, value = 0, prefix = "", suffix = "", decimals = 0, details = [] }) {
  const sectionRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [display, setDisplay] = useState(0);

  const finalStr = prefix + fmt(value, decimals) + (suffix || "");
  const sizing = numberSizing(finalStr);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = () => {
      setRevealed(true);
      if (reduced) { setDisplay(value); return; }
      let startTime = null;
      const duration = 1400;
      const tick = (ts) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        setDisplay(easeOut(progress) * value);
        if (progress < 1) requestAnimationFrame(tick);
        else setDisplay(value);
      };
      requestAnimationFrame(tick);
    };
    if (reduced) { setRevealed(true); setDisplay(value); return; }
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { obs.disconnect(); run(); } });
      }, { threshold: 0.25 });
      obs.observe(section);
      return () => obs.disconnect();
    }
    run();
  }, [value]);

  return (
    <section ref={sectionRef} className={`sc1-section ${revealed ? "sc1-reveal" : ""}`}>
      <div className="sc1-card relative flex flex-col justify-between gap-7 overflow-hidden rounded-[1.5rem] p-5 md:p-6 bg-card text-foreground shadow-sm">
        {/* accent glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(125% 125% at 100% 0%, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.07) 30%, transparent 62%)",
          }}
        />
        {/* grain overlay */}
        <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-50 mix-blend-overlay" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" style={{ maskImage: "radial-gradient(125% 125% at 100% 0%, black 0%, black 22%, transparent 72%)", WebkitMaskImage: "radial-gradient(125% 125% at 100% 0%, black 0%, black 22%, transparent 72%)" }}>
          <filter id={`sc1-grain-${title.replace(/\s/g, "")}`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#sc1-grain-${title.replace(/\s/g, "")})`} />
        </svg>

        {/* top row */}
        <div className="relative flex items-start justify-between gap-3">
          <h3 className="font-heading text-lg md:text-xl font-medium tracking-tight leading-tight min-w-0">{title}</h3>
          <svg className="shrink-0 w-10 h-10 md:w-12 md:h-12 text-primary" aria-hidden="true" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            {DOTS.map(([cx, cy], i) => (
              <circle key={`${cx}-${cy}`} className="sc1-dot" style={{ "--sc1-d": `${DOT_DELAYS[i]}s` }} cx={cx} cy={cy} r="9" />
            ))}
          </svg>
        </div>

        {/* bottom row */}
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex items-start leading-none tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
            <span
              className="font-heading font-bold"
              style={{ fontSize: `clamp(1.9rem, ${sizing.cqw}cqi, ${sizing.capRem}rem)` }}
            >
              {prefix}{fmt(display, decimals)}{suffix}
            </span>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 m-0 p-0 list-none">
            {details.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="block text-xs md:text-sm text-muted-foreground m-0 mb-0.5">{d.label}</dt>
                <dd className="block text-sm md:text-base font-medium m-0">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}