import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useDemo } from '../context/DemoContext';
import DateSelector from '../components/DateSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SectionHeader from '../components/SectionHeader';
import type { TransactionCategory, TransactionEntry } from '../types/types';

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
        const demoCats: TransactionCategory[] = [
          { id: 1, name: 'Egg Sales', type: 'income' },
          { id: 2, name: 'Food', type: 'expense' },
          { id: 3, name: 'Bedding', type: 'expense' },
        ];
        setCategories(demoCats);
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
        const demoHistory: TransactionEntry[] = JSON.parse(localStorage.getItem('demo_transactions') || '[]');
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
      const demoHistory: TransactionEntry[] = JSON.parse(localStorage.getItem('demo_transactions') || '[]');
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
      const currentLogs: TransactionEntry[] = JSON.parse(localStorage.getItem('demo_transactions') || '[]');
      const finalTx = { id: Date.now(), ...newTx };
      const updated = [finalTx, ...currentLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem('demo_transactions', JSON.stringify(updated));
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
      const currentLogs: TransactionEntry[] = JSON.parse(localStorage.getItem('demo_transactions') || '[]');
      const updated = currentLogs.filter(t => t.id !== id);
      localStorage.setItem('demo_transactions', JSON.stringify(updated));
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

  return (
    <div className="w-full max-w-lg mx-auto p-4 animate-fade-in space-y-6">
      
      {/* SUMMARY SECTION */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-col justify-between items-start mb-5 gap-4">
          <SectionHeader emoji="📊" title="Financial Summary" />
          <div className="flex bg-stone-100 p-1 rounded-xl w-full">
            {(['month', 'ytd', 'all'] as const).map(frame => (
              <button
                key={frame}
                onClick={() => setSummaryTimeframe(frame)}
                className={`flex-1 px-2 py-1.5 text-xs font-bold capitalize rounded-lg transition-colors ${
                  summaryTimeframe === frame ? 'bg-white shadow-xs text-stone-900' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {frame}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-green-500 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Income</p>
            <p className="text-sm font-bold text-emerald-700">€{summaryData.income.toFixed(2)}</p>
          </div>
          <div className="bg-rose-50/50 p-3 rounded-xl border border-red-500 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Expenses</p>
            <p className="text-sm font-bold text-rose-700">€{summaryData.expense.toFixed(2)}</p>
          </div>
          <div className={`${profit >= 0 ? 'bg-stone-800' : 'bg-red-900'} p-3 rounded-xl shadow-xs flex flex-col justify-center`}>
            <p className="text-[10px] font-bold text-white/90 uppercase tracking-wider mb-1">P/L (Net)</p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-white' : 'text-red-200'}`}>
              {profit >= 0 ? '+' : ''}€{profit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* ADD TRANSACTION FORM */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="text-lg font-bold text-stone-900 mb-4">💸 Log Transaction</h3>
        
        <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl mb-5">
          <button
            onClick={() => setTransactionType('expense')}
            className={`py-2 text-sm font-bold rounded-lg transition-colors ${transactionType === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Expense
          </button>
          <button
            onClick={() => setTransactionType('income')}
            className={`py-2 text-sm font-bold rounded-lg transition-colors ${transactionType === 'income' ? 'bg-white text-emerald-600 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
          >
            Income
          </button>
        </div>

        <DateSelector value={transactionDate} onChange={setTransactionDate} label="Transaction Date" />

        <div className="grid grid-cols-1 gap-4 mt-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
            >
              <option value="" disabled>Select {transactionType}</option>
              {categories.filter(c => c.type === transactionType).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Bought 2 bags of laying mash..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button
          onClick={handleSaveTransaction}
          disabled={isSubmitting}
          className={`w-full font-bold py-3 px-4 rounded-xl transition-colors shadow-xs text-white disabled:opacity-50 ${
            transactionType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-stone-800 hover:bg-stone-900'
          }`}
        >
          {isSubmitting ? 'Saving...' : `Save ${transactionType === 'income' ? 'Income' : 'Expense'}`}
        </button>
      </div>

      {/* TRANSACTION LEDGER */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-col justify-between items-start mb-5 gap-3 border-b border-stone-100 pb-4">
          <h3 className="text-lg font-bold text-stone-900">📋 Ledger History</h3>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 text-xs font-semibold rounded-lg px-2 py-2 text-stone-600 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        {history.length === 0 && !isLoadingHistory ? (
          <LoadingSpinner message="No transactions match this filter." size="sm" />
        ) : (
          <div className="space-y-2">
            {history.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-2.5 bg-stone-50 rounded-xl border border-stone-150">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-800 text-sm">
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-stone-500 bg-stone-200 px-1.5 py-0.5 rounded-md tracking-wider">
                      {tx.category}
                    </span>
                  </div>
                  {tx.description && (
                    <p className="text-[11px] text-stone-500 italic mt-0.5 leading-tight">
                      {tx.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '' : '-'}€{Number(tx.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-[10px] px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div ref={observerTarget} className="mt-4 py-2 text-center">
            <LoadingSpinner message="Loading ledger..." size="sm" />
          </div>
        )}
      </div>

    </div>
  );
}