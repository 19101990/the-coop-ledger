import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import { demoStore } from '../demo/demoStore';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import type { TransactionCategory, TransactionEntry } from '../types/types';
import PageContainer from '../components/PageContainer';
import { Card, EmptyState, Field, PrimaryButton, Section, Segmented, Select, TextButton } from '../components/ui';
import { inputClass, rowDivider } from '../components/uiStyles';
import { formatDayMonth, formatEUR, formatSignedEUR } from '../utils/format';

export default function TransactionsTracker() {
  const getTodayString = (): string => new Date().toISOString().split('T')[0];

  const { isDemo, triggerDemoToast } = useDemo();

  const [transactionDate, setTransactionDate] = useState(getTodayString());
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [history, setHistory] = useState<TransactionEntry[]>([]);
  const [summaryData, setSummaryData] = useState({ income: 0, expense: 0 });
  
  const [summaryTimeframe, setSummaryTimeframe] = useState<'all' | 'ytd' | 'month'>('month');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const observerTarget = useRef<HTMLDivElement | null>(null);
  const ITEMS_PER_PAGE = 10;

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

  // Reset category selection when switching between income/ expense
  useEffect(() => {
    setSelectedCategory('');
  }, [transactionType]);

  useEffect(() => {
    const fetchSummary = async () => {
      let query = supabase.from('transactions').select('type, amount');
      
      const today = new Date();
      if (summaryTimeframe === 'ytd') {
        query = query.gte('date', `${today.getFullYear()}-01-01`);
      } else if (summaryTimeframe === 'month') {
        const month = String(today.getMonth() + 1).padStart(2, '0');
        query = query.gte('date', `${today.getFullYear()}-${month}-01`);
      }

      if (isDemo) {
        const demoHistory = demoStore.getTransactions();
        let filtered = demoHistory;
        if (summaryTimeframe === 'ytd') {
          filtered = demoHistory.filter(t => t.date >= `${today.getFullYear()}-01-01`);
        } else if (summaryTimeframe === 'month') {
          const month = String(today.getMonth() + 1).padStart(2, '0');
          filtered = demoHistory.filter(t => t.date >= `${today.getFullYear()}-${month}-01`);
        }
        const inc = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        setSummaryData({ income: inc, expense: exp });
        return;
      }

      try {
        const { data, error } = await query;
        if (!error && data) {
          const inc = data.filter(d => d.type === 'income').reduce((sum, d) => sum + Number(d.amount), 0);
          const exp = data.filter(d => d.type === 'expense').reduce((sum, d) => sum + Number(d.amount), 0);
          setSummaryData({ income: inc, expense: exp });
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      }
    };
    fetchSummary();
  }, [summaryTimeframe, history, isDemo]);

  // Load history
  const fetchHistory = async (pageNumber: number, reset = false) => {
    if (isLoadingHistory || (!hasMore && !reset)) return;
    setIsLoadingHistory(true);

    const fromIndex = pageNumber * ITEMS_PER_PAGE;
    const toIndex = fromIndex + ITEMS_PER_PAGE - 1;

    if (isDemo) {
      const demoHistory = demoStore.getTransactions();
      let filtered = demoHistory;
      if (filterCategory !== 'all') {
        filtered = demoHistory.filter(t => t.category === filterCategory);
      }
      const paged = filtered.slice(fromIndex, toIndex + 1);
      
      if (reset) {
        setHistory(paged);
        setHasMore(paged.length === ITEMS_PER_PAGE);
      } else {
        setHistory(prev => [...prev, ...paged]);
        if (paged.length < ITEMS_PER_PAGE) setHasMore(false);
      }
      setIsLoadingHistory(false);
      return;
    }

    try {
      let query = supabase.from('transactions').select('*').order('date', { ascending: false }).range(fromIndex, toIndex);
      
      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        if (reset) {
          setHistory(data);
          setHasMore(data.length === ITEMS_PER_PAGE);
        } else {
          setHistory(prev => [...prev, ...data]);
          if (data.length < ITEMS_PER_PAGE) setHasMore(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // React to filter change
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchHistory(0, true);
  }, [filterCategory]);

  // Infinite scrolling
  useEffect(() => {
    if (page > 0) fetchHistory(page);
  }, [page]);

  useEffect(() => {
    const currentElement = observerTarget.current;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingHistory) {
          setPage(prevPage => prevPage + 1);
        }
      },
      { threshold: 1.0 }
    );
    if (currentElement) observer.observe(currentElement);
    return () => {
      if (currentElement) observer.unobserve(currentElement);
    };
  }, [hasMore, isLoadingHistory]);


  // Actions
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
      triggerDemoToast(`Demo Mode: ${transactionType} saved! 💰`);
      
      setAmount('');
      setDescription('');
      setPage(0);
      setHasMore(true);
      fetchHistory(0, true);
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('transactions').insert([newTx]);
      if (error) throw error;

      triggerDemoToast(`Live Mode: ${transactionType} logged! 💰`);
      
      setAmount('');
      setDescription('');
      setPage(0);
      setHasMore(true);
      fetchHistory(0, true);
    } catch (err: any) {
      console.error("Error saving tx:", err);
      alert(`Transaction Failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This will affect your ledger summaries.")) return;

    if (isDemo) {
      demoStore.deleteTransaction(id);
      triggerDemoToast('Demo Mode: Transaction deleted! 🗑️');
      setPage(0);
      fetchHistory(0, true);
      return;
    }

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      triggerDemoToast('Live Mode: Transaction deleted! 🗑️');
      setPage(0);
      fetchHistory(0, true);
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    }
  };

  const profit = summaryData.income - summaryData.expense;

  const totalFlow = summaryData.income + summaryData.expense;
  const incomeShare = totalFlow ? (summaryData.income / totalFlow) * 100 : 50;
  const timeframeLabel = { month: 'this month', ytd: 'this year', all: 'all time' }[summaryTimeframe];
  const categoryCode = (name: string) => name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '··';

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

        <section className="flex flex-col gap-[18px] rounded-[14px] bg-ink p-5 text-app">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-on-dark-muted">Net result · {timeframeLabel}</span>
            <span className="font-mono text-[38px] font-medium tracking-[-.03em] tabular-nums">{formatSignedEUR(profit)}</span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-[3px] bg-expense-on-dark">
            <div className="bg-income-on-dark" style={{ width: `${incomeShare}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-on-dark-muted">
                <span className="h-2 w-2 rounded-xs bg-income-on-dark" />
                Income
              </span>
              <span className="font-mono text-[17px] tabular-nums">{formatEUR(summaryData.income)}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-on-dark-muted">
                <span className="h-2 w-2 rounded-xs bg-expense-on-dark" />
                Expenses
              </span>
              <span className="font-mono text-[17px] tabular-nums">{formatEUR(summaryData.expense)}</span>
            </div>
          </div>
        </section>
      </div>

      <Section title="Log transaction">
        <div className="flex flex-col gap-[18px] rounded-[14px] border border-line bg-surface p-4">
          <Segmented
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={transactionType}
            onChange={setTransactionType}
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
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Filter by category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </Select>

        <Card padded={false}>
          {history.length === 0 && !isLoadingHistory ? (
            <EmptyState>No entries match.</EmptyState>
          ) : (
            history.map((tx) => (
              <div key={tx.id} className={`flex items-center gap-3 px-3.5 py-3 ${rowDivider}`}>
                <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-lg bg-subtle font-mono text-[11px] text-ink-soft">
                  {categoryCode(tx.category)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{tx.description || tx.category}</span>
                  <span className="text-xs text-muted">
                    {tx.category} · {formatDayMonth(tx.date)}
                  </span>
                </div>
                <div className="flex flex-none flex-col items-end">
                  <span className={`font-mono text-sm tabular-nums ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                    {formatSignedEUR(tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount))}
                  </span>
                  <TextButton tone="danger" className="py-0.5 text-xs" onClick={() => handleDelete(tx.id)}>
                    Delete
                  </TextButton>
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <div ref={observerTarget} className={rowDivider}>
              <LoadingSpinner message="Loading ledger…" size="sm" />
            </div>
          )}
        </Card>
      </Section>
    </PageContainer>
  );
}
