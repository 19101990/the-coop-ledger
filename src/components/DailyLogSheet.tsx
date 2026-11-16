import { useState } from 'react';
import type { DBLogEntry, EggCounts, EggVariety } from '../types/types';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import Sheet from './Sheet';
import DateSelector from './DateSelector';
import CounterControl from './CounterControl';
import { Card, PrimaryButton } from './ui';
import { EGG_SWATCHES, EGG_VARIETIES, countsFromLog, countsTotal, eggVarietyLabel, emptyEggCounts, todayISO } from '../utils/eggs';

interface DailyLogSheetProps {
  open: boolean;
  /** Entry being edited, or null for a new entry. */
  editingLog: DBLogEntry | null;
  onClose: () => void;
  /** Called after a successful save so screens can reload their data. */
  onSaved: () => void;
}

/**
 * Daily egg log form in a bottom sheet (opened from the "+" button or from Edit on the Eggs tab).
 * Mount with a fresh `key` per opening so the form initialises from `editingLog`.
 */
export default function DailyLogSheet({ open, editingLog, onClose, onSaved }: DailyLogSheetProps) {
  const { isDemo, triggerDemoToast } = useDemo();

  const [date, setDate] = useState(editingLog?.date ?? todayISO());
  const [counts, setCounts] = useState<EggCounts>(editingLog ? countsFromLog(editingLog) : emptyEggCounts());
  const [boxesForSale, setBoxesForSale] = useState(editingLog?.boxes_for_sale ?? 0);
  const [boxesPersonal, setBoxesPersonal] = useState(editingLog?.boxes_personal ?? 0);
  const [notes, setNotes] = useState(editingLog?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const total = countsTotal(counts);

  const adjust = (variety: EggVariety, amount: number) =>
    setCounts((prev) => ({ ...prev, [variety]: Math.max(0, prev[variety] + amount) }));

  const handleSave = async () => {
    if (total <= 0 || saving) return;
    setSaving(true);

    const logFields = {
      date,
      eggs_chocolate: counts.chocolate,
      eggs_brown: counts.brown,
      eggs_beige: counts.beige,
      eggs_white: counts.white,
      eggs_olive: counts.olive,
      eggs_blue: counts.blue,
      eggs_nato: counts.nato,
      eggs_perlhuhn: counts.perlhuhn,
      boxes_for_sale: boxesForSale,
      boxes_personal: boxesPersonal,
      notes: notes.trim() || null,
    };
    // Loose-egg change for the pantry: everything collected minus what was packed into boxes.
    const netLooseChange = total - (boxesForSale + boxesPersonal) * 10;

    try {
      // 🛑 DEMO MODE
      if (isDemo) {
        if (editingLog) {
          demoStore.updateDailyLog(editingLog.id, logFields);
          triggerDemoToast('Demo: daily log updated in the sandbox');
        } else {
          demoStore.addDailyLog(logFields);
          const pantry = demoStore.getPantry();
          demoStore.setPantry({
            boxes_for_sale: pantry.boxes_for_sale + boxesForSale,
            boxes_personal: pantry.boxes_personal + boxesPersonal,
            loose_eggs: pantry.loose_eggs + netLooseChange,
          });
          triggerDemoToast('Demo: daily log saved to the sandbox');
        }
        onSaved();
        return;
      }

      // 🟢 LIVE MODE
      if (editingLog) {
        const { error } = await supabase.from('daily_log').update(logFields).eq('id', editingLog.id);
        if (error) throw error;
        triggerDemoToast('Daily log updated');
      } else {
        const { data: pantryData, error: pantryError } = await supabase
          .from('pantry_inventory')
          .select('*')
          .order('last_updated', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pantryError) throw pantryError;

        const { error: logError } = await supabase.from('daily_log').insert([logFields]);
        if (logError) throw logError;

        const { error: updatePantryError } = await supabase.from('pantry_inventory').insert([
          {
            boxes_for_sale: (pantryData?.boxes_for_sale || 0) + boxesForSale,
            boxes_personal: (pantryData?.boxes_personal || 0) + boxesPersonal,
            loose_eggs: (pantryData?.loose_eggs || 0) + netLooseChange,
          },
        ]);
        if (updatePantryError) throw updatePantryError;
        triggerDemoToast('Daily log and pantry saved');
      }
      onSaved();
    } catch (err) {
      console.error('Unexpected tracking error:', err);
      alert(`Saving failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const packRows = [
    { label: 'Boxes for sale', value: boxesForSale, set: setBoxesForSale },
    { label: 'Boxes for personal use', value: boxesPersonal, set: setBoxesPersonal },
  ];

  return (
    <Sheet open={open} title={editingLog ? 'Edit daily log' : 'Daily egg log'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <DateSelector value={date} onChange={setDate} label="Date collected" />

        <div className="flex items-baseline justify-between border-b border-ink pb-2">
          <span className="text-[13px] text-muted">Total collected</span>
          <span className="font-mono text-[40px] font-medium tracking-[-.03em] tabular-nums">{total}</span>
        </div>

        <Card padded={false}>
          {EGG_VARIETIES.map((v) => (
            <CounterControl
              key={v}
              label={eggVarietyLabel(v)}
              swatch={EGG_SWATCHES[v]}
              value={counts[v]}
              onDecrement={() => adjust(v, -1)}
              onIncrement={() => adjust(v, 1)}
            />
          ))}
        </Card>

        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">Packed into boxes of 10</span>
          <Card padded={false}>
            {packRows.map(({ label, value, set }) => (
              <CounterControl
                key={label}
                label={label}
                value={value}
                onDecrement={() => set(Math.max(0, value - 1))}
                onIncrement={() => set(value + 1)}
              />
            ))}
          </Card>
        </div>

        <input
          type="text"
          aria-label="Notes"
          placeholder="Notes — weather, hens, coop work"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-11 w-full rounded-lg border border-edge bg-surface px-3 text-[15px] text-ink outline-none focus:border-ink"
        />

        <PrimaryButton onClick={handleSave} disabled={total <= 0 || saving}>
          {saving ? 'Saving…' : editingLog ? 'Update daily log' : 'Save daily log'}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
