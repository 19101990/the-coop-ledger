import { useState, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { useRefresh } from '../context/RefreshContext';
import { supabase } from '../supabaseClient';
import type { SaleEntry } from '../types/types';
import DateSelector from '../components/DateSelector';
import { demoStore } from '../demo/demoStore';
import PageContainer from '../components/PageContainer';
import { Card, Chevron, EmptyState, Field, PrimaryButton, Section, Segmented, Select, TextButton } from '../components/ui';
import { inputClass, rowDivider } from '../components/uiStyles';
import { formatDayMonth, formatEUR, todayLocal } from '../utils/format';
import EditSaleSheet from '../components/EditSaleSheet';
import { EGG_SALES_CATEGORY, hasIncome, saleIncomeDescription, takeFromPantry } from '../data/saleEffects';

interface SaleRow {
  id: number | string;
  customer_name: string;
  amount_boxes: number | string;
  price: number | string;
  status: 'Paid' | 'Gift';
  date: string;
}

const toSaleEntry = (row: SaleRow): SaleEntry => ({
  id: row.id.toString(),
  customerName: row.customer_name,
  // Stored as boxes of 10 (e.g. 1.2); round so 0.3 * 10 gives 3, not 3.0000000000000004.
  amountBoxes: Math.round(Number(row.amount_boxes) * 10),
  price: Number(row.price),
  status: row.status,
  date: row.date
});

export default function SalesTracker() {
  const getTodayString = todayLocal;

  const { isDemo, triggerDemoToast } = useDemo();

  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerInput, setNewCustomerInput] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const [eggsSoldInput, setEggsSoldInput] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Gift'>('Paid');
  const [saleDate, setSaleDate] = useState(getTodayString());

  const [salesLog, setSalesLog] = useState<SaleEntry[]>([]);
  // Sale open in the edit sheet. The recent sales list reloads quietly after any save or delete.
  const [editingSale, setEditingSale] = useState<SaleEntry | null>(null);
  const { refreshKey, notifyDataChanged } = useRefresh();

  useEffect(() => {
    const applyCustomers = (names: string[]) => {
      setCustomers(names);
      if (names.includes('Walk-in Customer')) {
        setSelectedCustomer('Walk-in Customer');
      } else if (names.length > 0) {
        setSelectedCustomer(names[0]);
      }
    };

    const fetchCustomers = async () => {
      // 🛑 DEMO MODE — sample customers only, never the real roster
      if (isDemo) {
        applyCustomers(demoStore.getCustomers());
        return;
      }

      try {
        const { data, error } = await supabase
          .from('customers')
          .select('name')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching customer options:', error.message);
          return;
        }

        if (data) applyCustomers(data.map(c => c.name));
      } catch (err) {
        console.error('Unexpected error loading roster:', err);
      }
    };

    fetchCustomers();
  }, [isDemo]);

  useEffect(() => {
    if (paymentStatus === 'Gift') {
      setPriceOverride('0.00');
      setIsManualPrice(false);
    } else if (!isManualPrice) {
      const rawCount = parseInt(eggsSoldInput) || 0;
      setPriceOverride((rawCount * 0.50).toFixed(2));
    }
  }, [eggsSoldInput, paymentStatus, isManualPrice]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustomerInput.trim();

    if (!cleanName) return;
    if (customers.includes(cleanName)) {
      alert('This name already exists inside your roster records!');
      return;
    }

    // 🛑 DEMO MODE
    if (isDemo) {
      demoStore.addCustomer(cleanName);
      setCustomers(demoStore.getCustomers());
      setSelectedCustomer(cleanName);
      setNewCustomerInput('');
      setShowAddCustomer(false);

      triggerDemoToast(`Demo Mode: Customer "${cleanName}" added locally!`);

      return;
    }

    // 🟢 LIVE MODE
    try {
      const { error } = await supabase
        .from('customers')
        .insert([
          {
            name: cleanName,
            is_active: true
          }
        ]);

      if (error) {
        console.error('Failed creating customer account:', error.message);
        alert(`Error adding name: ${error.message}`);
        return;
      }

      setCustomers(prev => [...prev, cleanName].sort());
      setSelectedCustomer(cleanName);
      setNewCustomerInput('');
      setShowAddCustomer(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchRecentSales = async () => {
      // 🛑 DEMO MODE — sample sales only
      if (isDemo) {
        setSalesLog(demoStore.getRecentSales(10).map(toSaleEntry));
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('date', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching sales ledger:', error.message);
          return;
        }

        if (data) {
          setSalesLog(data.map(toSaleEntry));
        }
      } catch (err) {
        console.error('Unexpected error loading history:', err);
      }
    };

    fetchRecentSales();
  }, [isDemo, refreshKey]);

  // Pantry stock change for a sale (shared with editing/deleting sales).
  const deductFromPantry = takeFromPantry;

  const resetSaleForm = () => {
    setEggsSoldInput('');
    setPriceOverride('');
    setIsManualPrice(false);
    setPaymentStatus('Paid');
    setSaleDate(getTodayString());

    if (customers.includes('Walk-in Customer')) {
      setSelectedCustomer('Walk-in Customer');
    }
  };

  const handleSaveSale = async () => {
    const rawEggs = parseInt(eggsSoldInput);
    if (!rawEggs || rawEggs <= 0) return;
    if (!selectedCustomer) {
      alert('Please pick a customer profile before checking out.');
      return;
    }

    const finalDate = saleDate;
    const finalPrice = paymentStatus === 'Gift' ? 0 : parseFloat(priceOverride) || 0;
    const calculatedBoxes = rawEggs / 10;

    // 🛑 DEMO MODE
    if (isDemo) {
      const saleDateFinal = finalDate || getTodayString();
      demoStore.addSale({
        customer_name: selectedCustomer,
        amount_boxes: calculatedBoxes,
        price: finalPrice,
        status: paymentStatus,
        date: saleDateFinal
      });

      const pantry = demoStore.getPantry();
      const { newSaleBoxes, newLoose } = deductFromPantry(pantry, rawEggs);
      demoStore.setPantry({ ...pantry, boxes_for_sale: newSaleBoxes, loose_eggs: newLoose });

      if (hasIncome(paymentStatus, finalPrice)) {
        demoStore.addTransaction({
          date: saleDateFinal,
          type: 'income',
          category: EGG_SALES_CATEGORY,
          description: saleIncomeDescription(rawEggs, selectedCustomer),
          amount: finalPrice
        });
      }

      setSalesLog(demoStore.getRecentSales(10).map(toSaleEntry));
      triggerDemoToast("Demo Mode: Sale saved to the sandbox!");
      resetSaleForm();
      notifyDataChanged();
      return;
    }

    // 🟢 LIVE MODE
    try {
      const { data: pantryData, error: pantryError } = await supabase
        .from('pantry_inventory')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pantryError) throw pantryError;

      const currentPersonalBoxes = pantryData?.boxes_personal || 0;
      const { newSaleBoxes, newLoose } = deductFromPantry(
        { boxes_for_sale: pantryData?.boxes_for_sale || 0, loose_eggs: pantryData?.loose_eggs || 0 },
        rawEggs
      );

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            customer_name: selectedCustomer,
            amount_boxes: calculatedBoxes,
            price: finalPrice,
            status: paymentStatus,
            date: finalDate || todayLocal(),
          }
        ])
        .select();

      if (saleError) throw saleError;

      const { error: updatePantryError } = await supabase
        .from('pantry_inventory')
        .insert([
          {
            boxes_for_sale: newSaleBoxes,
            boxes_personal: currentPersonalBoxes,
            loose_eggs: newLoose
          }
        ]);

      if (updatePantryError) throw updatePantryError;
      if (hasIncome(paymentStatus, finalPrice)) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert([
            {
              date: finalDate || todayLocal(),
              type: 'income',
              category: EGG_SALES_CATEGORY,
              description: saleIncomeDescription(rawEggs, selectedCustomer),
              amount: finalPrice
            }
          ]);

        if (txError) {
          console.error('Failed to log automatic transaction:', txError.message);
        }
      }

      if (saleData && saleData.length > 0) {
        setSalesLog([toSaleEntry(saleData[0]), ...salesLog].slice(0, 10));
        triggerDemoToast('Live Mode: Sale and Pantry updated! 💰');
      }

      resetSaleForm();
      // Pantry, ledger, overview and reports all change with a sale.
      notifyDataChanged();
    } catch (err: any) {
      console.error('Unexpected error tracking transaction:', err);
      alert(`Transaction Failed: ${err.message}`);
    }
  };

  const eggsCount = parseInt(eggsSoldInput) || 0;
  const priceValue = paymentStatus === 'Gift' ? 0 : parseFloat(priceOverride) || 0;
  const newCustomerName = newCustomerInput.trim();
  const canAddCustomer = newCustomerName !== '' && !customers.includes(newCustomerName);
  const priceHint = paymentStatus === 'Gift' ? 'gift' : isManualPrice ? 'custom' : `${formatEUR(0.5)} / egg`;

  return (
    <PageContainer>
      <div className="flex flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-4">
        <Field
          label="Customer"
          right={
            <TextButton tone="ink" onClick={() => { setShowAddCustomer(!showAddCustomer); setNewCustomerInput(''); }}>
              {showAddCustomer ? 'Cancel' : '+ Add customer'}
            </TextButton>
          }
        >
          {!showAddCustomer ? (
            <Select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
              <option value="" disabled>Select customer</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          ) : (
            <form onSubmit={handleAddCustomer} className="flex gap-2">
              <input
                type="text"
                placeholder="Customer name"
                value={newCustomerInput}
                onChange={(e) => setNewCustomerInput(e.target.value)}
                className={`${inputClass} min-w-0 flex-1`}
                autoFocus
              />
              <button
                type="submit"
                disabled={!canAddCustomer}
                className="h-11 cursor-pointer rounded-lg bg-ink px-[18px] text-sm font-medium text-app active:bg-ink-pressed disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </form>
          )}
        </Field>

        <div className="flex flex-col gap-2">
          <label className="flex items-baseline gap-2 border-b border-ink pb-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              aria-label="Eggs sold"
              value={eggsSoldInput}
              onChange={(e) => setEggsSoldInput(e.target.value.replace(/\D/g, ''))}
              className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[40px] font-medium tracking-[-.03em] text-ink outline-none"
            />
            <span className="text-[15px] text-muted">eggs</span>
          </label>
          <div className="flex gap-1.5">
            {[6, 10, 12, 20, 30].map((n) => {
              const active = eggsSoldInput === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEggsSoldInput(String(n))}
                  className={`h-9 flex-1 cursor-pointer rounded-lg border font-mono text-[13px] ${
                    active ? 'border-ink bg-ink text-app' : 'border-edge bg-surface text-ink hover:bg-subtle'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-muted">
            {eggsCount > 0
              ? `Takes ${Math.floor(eggsCount / 10)} box${Math.floor(eggsCount / 10) === 1 ? '' : 'es'} + ${eggsCount % 10} loose from the pantry`
              : 'Pick a quantity or type it'}
          </span>
        </div>

        <div className="grid grid-cols-2 items-end gap-2.5">
          <Field label="Payment">
            <Segmented
              options={[{ value: 'Paid', label: 'Paid' }, { value: 'Gift', label: 'Gift' }]}
              value={paymentStatus}
              onChange={setPaymentStatus}
            />
          </Field>
          <Field label={`Price · ${priceHint}`}>
            <label
              className={`flex h-11 items-center gap-px rounded-lg border border-edge bg-app px-3 focus-within:border-ink ${
                paymentStatus === 'Gift' ? 'opacity-50' : ''
              }`}
            >
              <span className="font-mono text-muted">€</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-label="Price"
                disabled={paymentStatus === 'Gift'}
                value={priceOverride}
                onChange={(e) => {
                  setPriceOverride(e.target.value);
                  setIsManualPrice(true);
                }}
                className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] text-ink outline-none"
              />
            </label>
          </Field>
        </div>

        <DateSelector value={saleDate} onChange={setSaleDate} label="Date of sale" />

        <PrimaryButton onClick={handleSaveSale} disabled={eggsCount <= 0}>
          {paymentStatus === 'Gift' ? 'Record gift' : `Record sale · ${formatEUR(priceValue)}`}
        </PrimaryButton>
      </div>

      <Section title="Recent sales">
        <Card padded={false}>
          {salesLog.length === 0 ? (
            <EmptyState>No sales yet.</EmptyState>
          ) : (
            salesLog.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => setEditingSale(sale)}
                className={`flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left hover:bg-app ${rowDivider}`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{sale.customerName}</span>
                  <span className="text-xs text-muted">
                    {formatDayMonth(sale.date)} · {sale.amountBoxes} eggs
                  </span>
                </div>
                {sale.status === 'Gift' ? (
                  <span className="rounded-md bg-gift-bg px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[.06em] text-gift uppercase">Gift</span>
                ) : (
                  <span className="rounded-md bg-income-bg px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[.06em] text-income uppercase tabular-nums">
                    {formatEUR(sale.price)}
                  </span>
                )}
                <Chevron className="-rotate-90 text-faint" />
              </button>
            ))
          )}
        </Card>
      </Section>

      <EditSaleSheet
        key={editingSale?.id ?? 'none'}
        sale={editingSale}
        customers={customers}
        onClose={() => setEditingSale(null)}
        onChanged={() => {
          setEditingSale(null);
          notifyDataChanged();
        }}
      />
    </PageContainer>
  );
}
