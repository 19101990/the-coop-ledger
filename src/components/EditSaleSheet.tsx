import { useState } from 'react';
import type { SaleEntry } from '../types/types';
import { useDemo } from '../context/DemoContext';
import Sheet from './Sheet';
import DateSelector from './DateSelector';
import { Button, Field, PrimaryButton, Segmented, Select } from './ui';
import { formatEUR } from '../utils/format';
import { deleteSale, updateSale, type SaleChangeResult } from '../data/saleEffects';

const PRICE_PER_EGG = 0.5;

interface EditSaleSheetProps {
  sale: SaleEntry | null;
  customers: string[];
  onClose: () => void;
  /** Called after a successful save or delete so the list can reload. */
  onChanged: () => void;
}

/**
 * Edit or delete a recorded sale. Pantry stock and the sale's ledger income entry are
 * kept in sync (see data/saleEffects). Mount with a fresh `key` per sale.
 */
export default function EditSaleSheet({ sale, customers, onClose, onChanged }: EditSaleSheetProps) {
  const { isDemo, triggerDemoToast } = useDemo();

  const [customer, setCustomer] = useState(sale?.customerName ?? '');
  const [eggs, setEggs] = useState(String(sale?.amountBoxes ?? ''));
  const [status, setStatus] = useState<SaleEntry['status']>(sale?.status ?? 'Paid');
  const [price, setPrice] = useState(sale ? sale.price.toFixed(2) : '');
  const [date, setDate] = useState(sale?.date ?? '');
  const [busy, setBusy] = useState(false);

  if (!sale) return null;

  const eggCount = parseInt(eggs) || 0;
  const priceValue = status === 'Gift' ? 0 : parseFloat(price) || 0;
  // Keep the sale's own customer selectable even if they're no longer in the active list.
  const customerOptions = customers.includes(sale.customerName) ? customers : [sale.customerName, ...customers];

  const report = (result: SaleChangeResult, done: string) => {
    if (result.ledgerSynced) {
      triggerDemoToast(done);
    } else {
      alert(`${done}\n\nThe matching income entry in the Ledger couldn't be found (it may have been edited there), so the Ledger was left unchanged — please check it.`);
    }
    onChanged();
  };

  const handleSave = async () => {
    if (eggCount <= 0 || !customer || busy) return;
    setBusy(true);
    try {
      const result = await updateSale(isDemo, sale, { customerName: customer, eggs: eggCount, price: priceValue, status, date });
      report(result, isDemo ? 'Demo: sale updated in the sandbox' : 'Sale updated');
    } catch (err) {
      console.error('Failed to update sale:', err);
      alert(`Saving failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy || !window.confirm('Delete this sale? Its eggs go back into the pantry and its income entry is removed from the Ledger.')) return;
    setBusy(true);
    try {
      const result = await deleteSale(isDemo, sale);
      report(result, isDemo ? 'Demo: sale deleted from the sandbox' : 'Sale deleted');
    } catch (err) {
      console.error('Failed to delete sale:', err);
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open title="Edit sale" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field label="Customer">
          <Select onPage value={customer} onChange={(e) => setCustomer(e.target.value)}>
            {customerOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>

        <label className="flex items-baseline gap-2 border-b border-ink pb-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Eggs sold"
            value={eggs}
            onChange={(e) => setEggs(e.target.value.replace(/\D/g, ''))}
            className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[32px] font-medium tracking-[-.03em] text-ink outline-none"
          />
          <span className="text-[15px] text-muted">eggs</span>
        </label>

        <div className="grid grid-cols-2 items-end gap-2.5">
          <Field label="Payment">
            <Segmented
              options={[{ value: 'Paid', label: 'Paid' }, { value: 'Gift', label: 'Gift' }]}
              value={status}
              onChange={(v) => {
                setStatus(v);
                // Back to paid from a gift: start from the usual price per egg.
                if (v === 'Paid' && !(parseFloat(price) > 0)) setPrice((eggCount * PRICE_PER_EGG).toFixed(2));
              }}
            />
          </Field>
          <Field label={status === 'Gift' ? 'Price · gift' : 'Price'}>
            <label
              className={`flex h-11 items-center gap-px rounded-lg border border-edge bg-surface px-3 focus-within:border-ink ${
                status === 'Gift' ? 'opacity-50' : ''
              }`}
            >
              <span className="font-mono text-muted">€</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-label="Price"
                disabled={status === 'Gift'}
                value={status === 'Gift' ? '0.00' : price}
                onChange={(e) => setPrice(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] text-ink outline-none"
              />
            </label>
          </Field>
        </div>

        <DateSelector value={date} onChange={setDate} label="Date of sale" />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="danger" onClick={handleDelete} disabled={busy}>
            Delete sale
          </Button>
          <PrimaryButton size="md" onClick={handleSave} disabled={eggCount <= 0 || busy}>
            {busy ? 'Saving…' : status === 'Gift' ? 'Save gift' : `Save · ${formatEUR(priceValue)}`}
          </PrimaryButton>
        </div>
      </div>
    </Sheet>
  );
}
