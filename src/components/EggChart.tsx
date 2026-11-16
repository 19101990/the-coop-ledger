import { useState } from 'react';
import type { EggSeries } from '../utils/eggChart';

const num = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, useGrouping: false });

/**
 * Sequential green ramp, light → dark (OKLCH hue 155, the app's income green; L 0.74 → 0.39).
 * Checked with the dataviz validator: lightness strictly decreasing, adjacent steps ≥ 0.06 apart,
 * single hue, lightest step 2.21:1 on the white card surface (#ffffff) so low bars never vanish.
 */
const GREENS = ['#78bd91', '#5ca879', '#419363', '#2f7d50', '#216740', '#195131'];

/**
 * Single-series column chart of eggs collected (dataviz guidelines: thin bars, 4px rounded
 * tops anchored to the baseline, 2px gaps, one selective label, hover/tap readout, table view
 * for screen readers). Bars are shaded light → dark green by how many eggs; a dashed line
 * marks the average and only the latest bar carries a value label.
 * The line above the bars is the readout: the period summary, or the bar being hovered/tapped.
 */
export default function EggChart({ series }: { series: EggSeries }) {
  const { buckets, perDay } = series;
  const [active, setActive] = useState<number | null>(null);

  const avg = series.loggedDays ? series.total / series.loggedDays : 0;
  const max = Math.max(1, avg, ...buckets.map((b) => b.value ?? 0)) * 1.15; // headroom for the cap label
  const pct = (v: number) => `${(v / max) * 100}%`;
  const last = buckets.length - 1;

  // Shade by magnitude within this period: lowest bar lightest, highest darkest.
  const logged = buckets.flatMap((b) => (b.value === null ? [] : [b.value]));
  const lo = Math.min(...logged);
  const hi = Math.max(...logged);
  const shade = (v: number) =>
    GREENS[hi > lo ? Math.round(((v - lo) / (hi - lo)) * (GREENS.length - 1)) : Math.floor(GREENS.length / 2)];

  /** Short text for the readout line; `full` adds the logged-days detail (screen readers). */
  const valueText = (i: number, full = false) => {
    const b = buckets[i];
    if (b.value === null) return 'no log';
    if (!perDay) return `${b.value} egg${b.value === 1 ? '' : 's'}`;
    const short = `${num.format(b.value)} / day · ${b.total} eggs`;
    return full ? `${short} over ${b.loggedDays} logged day${b.loggedDays === 1 ? '' : 's'}` : short;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Readout */}
      <div className="flex min-h-4 items-center gap-2 font-mono text-xs" aria-live="polite">
        {active !== null ? (
          <span className="text-ink">
            <span className="font-sans font-medium">{buckets[active].title}</span> · {valueText(active)}
          </span>
        ) : series.loggedDays ? (
          <span className="text-muted">
            avg {num.format(avg)} / day · {series.total} eggs · {series.loggedDays} day{series.loggedDays === 1 ? '' : 's'} logged
          </span>
        ) : (
          <span className="text-muted">No logs in this period</span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative h-[132px]" onPointerLeave={() => setActive(null)}>
          {series.loggedDays > 0 && (
            <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-faint" style={{ bottom: pct(avg) }} />
          )}

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {buckets.map((b, i) => (
              <button
                key={b.key}
                type="button"
                aria-label={`${b.title}: ${valueText(i, true)}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive((a) => (a === i ? null : i))}
                className="relative flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center outline-none"
              >
                {b.value !== null && (
                  <span
                    // While a bar is selected, the others fade so it stands out.
                    className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${active !== null && active !== i ? 'opacity-35' : ''}`}
                    style={{ height: `max(2px, ${pct(b.value)})`, background: shade(b.value) }}
                  />
                )}
                {/* Selective direct label: only the latest bar's value, on its cap. */}
                {i === last && b.value !== null && (
                  <span
                    className="pointer-events-none absolute font-mono text-[10px] font-medium text-ink"
                    style={{ bottom: `calc(${pct(b.value)} + 3px)` }}
                  >
                    {num.format(b.value)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Axis labels (some skipped on dense periods) */}
        <div className="flex gap-[2px] border-t border-line pt-1.5" aria-hidden="true">
          {buckets.map((b, i) => (
            <span
              key={b.key}
              // Edge labels hug the chart's edges so wide labels ("16 Nov") don't spill outside it.
              className={`flex min-w-0 flex-1 font-mono text-[9px] whitespace-nowrap text-faint ${
                i === 0 ? 'justify-start' : i === last ? 'justify-end' : 'justify-center'
              }`}
            >
              {b.axisLabel}
            </span>
          ))}
        </div>
      </div>

      {/* Key for the shading */}
      {logged.length > 1 && (
        <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted" aria-hidden="true">
          Fewer
          <span className="flex gap-px">
            {GREENS.map((g) => (
              <span key={g} className="h-1.5 w-2.5 first:rounded-l-sm last:rounded-r-sm" style={{ background: g }} />
            ))}
          </span>
          More
        </div>
      )}

      {/* Table view for screen readers. sr-only goes on a wrapper div: a <table> ignores the
          1px width and grows to its content, which pushed the page wider than the screen. */}
      <div className="sr-only">
        <table>
          <caption>{perDay ? 'Average eggs per logged day' : 'Eggs collected per day'}</caption>
          <tbody>
            {buckets.map((b, i) => (
              <tr key={b.key}>
                <th scope="row">{b.title}</th>
                <td>{valueText(i, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
