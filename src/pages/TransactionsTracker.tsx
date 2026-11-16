import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import type { TransactionCategory, TransactionEntry } from '../types/types';
import PageContainer from '../components/PageContainer';
import Sheet from '../components/Sheet';
import { Card, EmptyState, Field, PrimaryButton, Section, Segmented, Select } from '../components/ui';
import { inputClass } from '../components/uiStyles';
import { formatEUR, formatFullDate, formatSignedEUR } from '../utils/format';
import { compareNewestFirst, signedAmount } from '../utils/transactions';
import TransactionRow from '../components/TransactionRow';
import NetResultCard from '../components/NetResultCard';

type Timeframe = 'month' | 'ytd' | 'all';
type TypeFilter = 'all' | 'income' | 'expense';

const ROWS_PER_STEP = 50;

const signed = signedAmount;

/** Every transaction. Supabase caps a request at 1000 rows, so load in pages. */
async function loadAllTransactions(isDemo: boolean): Promise<TransactionEntry[]> {
  if (isDemo) return demoStore.getTransactions();

  const PAGE = 1000;
  const rows: TransactionEntry[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []).map((t) => ({ ...t, amount: Number(t.amount) })));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Start date (inclusive) for the summary card, or null for all time. */
const timeframeStart = (tf: Timeframe): string | null => {
  const today = new Date();
  if (tf === 'ytd') return `${today.getFullYear()}-01-01`;
  if (tf === 'month') return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  return null;
};

export default function TransactionsTracker() {
  const getTodayString = (): string => new Date().toISOString().split('T')[0];

  const { isDemo, triggerDemoToast } = useDemo();

  // Add form
  const [transactionDate, setTransactionDate] = useState(getTodayString());
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<TransactionCategory[]>([]);

  // All transactions; reloaded after a save or delete by bumping `version`.
  const [allRows, setAllRows] = useState<TransactionEntry[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [version, setVersion] = useState(0);

  // Summary + filters
  const [summaryTimeframe, setSummaryTimeframe] = useState<Timeframe>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_STEP);

  // Details sheet
  const [selected, setSelected] = useState<TransactionEntry | null>(null);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      if (isDemo) {
        setCategories(demoStore.getCategories());
        return;
      }
      try {
        const { data, error } = await supabase.from('transaction_categories').select('*').order('name');
        if (!error && data) setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, [isDemo]);

  useEffect(() => {
    let cancelled = false;
    loadAllTransactions(isDemo)
      .then((rows) => {
        if (!cancelled) {
          setAllRows(rows);
          setLoadError(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load transactions:', err);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo, version]);

  // ---------- Derived data ----------

  const rows = allRows ?? [];

  // Running balance over the whole ledger, oldest first (date, then id).
  const balanceById = new Map<number, number>();
  [...rows]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .reduce((bal, t) => {
      const next = bal + signed(t);
      balanceById.set(t.id, next);
      return next;
    }, 0);

  const start = timeframeStart(summaryTimeframe);
  const summaryRows = start ? rows.filter((t) => t.date >= start) : rows;
  const summary = {
    income: summaryRows.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    expense: summaryRows.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
  };
  const timeframeLabel = { month: 'this month', ytd: 'this year', all: 'all time' }[summaryTimeframe];

  const query = search.trim().toLowerCase();
  const filtered = rows
    .filter((t) => typeFilter === 'all' || t.type === typeFilter)
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .filter((t) => !query || `${t.description ?? ''} ${t.category}`.toLowerCase().includes(query))
    .sort(compareNewestFirst);

  const visibleRows = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  // Show more rows as the end of the list scrolls into view.
  useEffect(() => {
    const el = observerTarget.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((n) => n + ROWS_PER_STEP);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  // Start from the top of the list whenever the filters change.
  const resetPaging = () => setVisibleCount(ROWS_PER_STEP);

  // ---------- Actions ----------

  const handleSaveTransaction = async () => {
    if (!selectedCategory || !amount || parseFloat(amount) <= 0) {
      alert("Please select a category and enter a valid amount.");
      return;
    }

    setIsSubmitting(true);
    const newTx = {
      date: transactionDate,
      type: transactionType,
      category: selectedCategory,
      description: description.trim() || null,
      amount: parseFloat(amount)
    };

    if (isDemo) {
      demoStore.addTransaction(newTx);
      triggerDemoToast(`Demo: ${transactionType} saved to the sandbox`);
      setAmount('');
      setDescription('');
      setVersion((v) => v + 1);
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('transactions').insert([newTx]);
      if (error) throw error;

      triggerDemoToast(`${transactionType === 'income' ? 'Income' : 'Expense'} saved`);
      setAmount('');
      setDescription('');
      setVersion((v) => v + 1);
    } catch (err) {
      console.error("Error saving tx:", err);
      alert(`Saving failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This will affect your ledger summaries.")) return;

    if (isDemo) {
      demoStore.deleteTransaction(id);
      triggerDemoToast('Demo: transaction deleted from the sandbox');
      setSelected(null);
      setVersion((v) => v + 1);
      return;
    }

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      triggerDemoToast('Transaction deleted');
      setSelected(null);
      setVersion((v) => v + 1);
    } catch (err) {
      alert(`Deletion failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ---------- Render ----------

  const amountClass = (t: TransactionEntry) => (t.type === 'income' ? 'text-income' : 'text-expense');

  return (
    <PageContainer>
      <div className="flex flex-col gap-2.5">
        <Segmented
          compact
          options={[
            { value: 'month', label: 'Month' },
            { value: 'ytd', label: 'Year to date' },
            { value: 'all', label: 'All time' },
          ]}
          value={summaryTimeframe}
          onChange={setSummaryTimeframe}
        />
        <NetResultCard periodLabel={timeframeLabel} income={summary.income} expense={summary.expense} />
      </div>

      <Section title="Log transaction">
        <div className="flex flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-4">
          <Segmented
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={transactionType}
            onChange={(v) => {
              setTransactionType(v);
              // Categories differ per type, so clear the selection.
              setSelectedCategory('');
            }}
          />

          <DateSelector value={transactionDate} onChange={setTransactionDate} label="Date" />

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Category">
              <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="" disabled>Select</option>
                {categories.filter((c) => c.type === transactionType).map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount">
              <label className="flex h-11 items-center gap-1.5 rounded-lg border border-edge bg-app px-3 focus-within:border-ink">
                <span className="font-mono text-muted">€</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  aria-label="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] text-ink outline-none"
                />
              </label>
            </Field>
          </div>

          <Field label="Description (optional)">
            <input
              type="text"
              placeholder="e.g. Layer pellets 25kg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </Field>

          <PrimaryButton onClick={handleSaveTransaction} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : `Save ${transactionType === 'income' ? 'income' : 'expense'}`}
          </PrimaryButton>
        </div>
      </Section>

      <Section title="History">
        <div className="flex flex-col gap-2">
          <input
            type="search"
            placeholder="Search entries"
            aria-label="Search entries"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPaging();
            }}
            className={inputClass}
          />
          <Segmented
            compact
            options={[
              { value: 'all', label: 'All' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expenses' },
            ]}
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              resetPaging();
            }}
          />
          <Select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              resetPaging();
            }}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </div>

        <Card padded={false}>
          {!allRows ? (
            loadError ? <EmptyState>Could not load the ledger.</EmptyState> : <LoadingSpinner message="Loading ledger…" size="sm" />
          ) : filtered.length === 0 ? (
            <p className="m-0 px-5 py-10 text-center text-sm text-muted">No entries match.</p>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 px-3.5 py-2.5 font-mono text-[10px] tracking-[.08em] text-muted uppercase">
                <span>Entry</span>
                <span className="min-w-[76px] text-right">Amount</span>
                <span className="min-w-[76px] text-right">Balance</span>
              </div>

              {visibleRows.map((t) => (
                <TransactionRow key={t.id} tx={t} balance={balanceById.get(t.id) ?? 0} onClick={() => setSelected(t)} />
              ))}

              {hasMore && (
                <div ref={observerTarget} className="border-t border-divider">
                  <LoadingSpinner message="Loading more…" size="sm" />
                </div>
              )}
            </>
          )}
        </Card>
      </Section>

      <Sheet open={selected !== null} title={selected ? selected.description || selected.category : ''} onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between border-b border-ink pb-2">
              <span className="text-[13px] text-muted">{selected.type === 'income' ? 'Income' : 'Expense'}</span>
              <span className={`font-mono text-[32px] font-medium tracking-[-.03em] tabular-nums ${amountClass(selected)}`}>
                {formatSignedEUR(signed(selected))}
              </span>
            </div>

            <Card padded={false}>
              {[
                ['Date', formatFullDate(selected.date)],
                ['Category', selected.category],
                ['Description', selected.description || '—'],
                ['Balance after', formatEUR(balanceById.get(selected.id) ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-t border-divider px-3.5 py-3 first:border-t-0">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-right text-sm">{value}</span>
                </div>
              ))}
            </Card>

            <button
              type="button"
              onClick={() => handleDelete(selected.id)}
              className="h-[52px] w-full cursor-pointer rounded-xl border border-expense/40 bg-surface text-base font-medium text-expense hover:bg-expense/5"
            >
              Delete entry
            </button>
          </div>
        )}
      </Sheet>
    </PageContainer>
  );
}
