import { useState, useEffect } from 'react';
import { useDemo } from '../context/DemoContext';
import { supabase } from '../supabaseClient';
import type { SaleEntry } from '../types/types';

export default function SalesTracker() {

  const { isDemo, triggerDemoToast } = useDemo();

  const [customers, setCustomers] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [newCustomerInput, setNewCustomerInput] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  
  const [eggsSoldInput, setEggsSoldInput] = useState('');
  const [priceOverride, setPriceOverride] = useState('');
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Gift'>('Paid');
  const [saleDate, setSaleDate] = useState('today');
  const [customDate, setCustomDate] = useState('');

  const [salesLog, setSalesLog] = useState<SaleEntry[]>([]);

  useEffect(() => {
    const fetchCustomers = async () => {
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

        if (data) {
          const names = data.map(c => c.name);
          setCustomers(names);
          
          if (names.includes('Walk-in Customer')) {
            setSelectedCustomer('Walk-in Customer');
          } else if (names.length > 0) {
            setSelectedCustomer(names[0]);
          }
        }
      } catch (err) {
        console.error('Unexpected error loading roster:', err);
      }
    };

    fetchCustomers();
  }, []);

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
      const updatedCustomers = [...customers, cleanName].sort();
      setCustomers(updatedCustomers);
      setSelectedCustomer(cleanName);
      setNewCustomerInput('');
      setShowAddCustomer(false);
      
      localStorage.setItem('demo_customers', JSON.stringify(updatedCustomers));
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
          const formattedSales = data.map((dbSale: any) => ({
            id: dbSale.id.toString(),
            customerName: dbSale.customer_name,
            amountBoxes: Number(dbSale.amount_boxes) * 10,
            price: Number(dbSale.price),
            status: dbSale.status,
            date: dbSale.date
          }));

          setSalesLog(formattedSales);
        }
      } catch (err) {
        console.error('Unexpected error loading history:', err);
      }
    };

    fetchRecentSales();
  }, []);

  const handleSaveSale = async () => {
    const rawEggs = parseInt(eggsSoldInput);
    if (!rawEggs || rawEggs <= 0) return;
    if (!selectedCustomer) {
      alert('Please pick a customer profile before checking out.');
      return;
    }

    const finalDate = saleDate === 'today' ? new Date().toISOString().split('T')[0] : customDate;
    const finalPrice = paymentStatus === 'Gift' ? 0 : parseFloat(priceOverride) || 0;
    const calculatedBoxes = rawEggs / 10;

    // 🛑 DEMO MODE
    if (isDemo) {
      const newLogEntry: SaleEntry = {
        id: Math.random().toString(36).substring(7),
        customerName: selectedCustomer,
        amountBoxes: calculatedBoxes * 10, 
        price: finalPrice,
        status: paymentStatus,
        date: finalDate || new Date().toISOString().split('T')[0]
      };

      const updatedLog = [newLogEntry, ...salesLog].slice(0, 10);
      setSalesLog(updatedLog);

      localStorage.setItem('demo_sales_ledger', JSON.stringify(updatedLog));
      triggerDemoToast("Demo Mode: Sale saved to LocalStorage!");
      
      return;
    }

    // 🟢 LIVE MODE
    try {
      // Fetch current pantry state
      const { data: pantryData, error: pantryError } = await supabase
        .from('pantry_inventory')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pantryError) throw pantryError;

      let currentSaleBoxes = pantryData?.boxes_for_sale || 0;
      let currentPersonalBoxes = pantryData?.boxes_personal || 0;
      let currentLoose = pantryData?.loose_eggs || 0;

      // Calculate deductions and borrowing logic
      let boxesToDeduct = Math.floor(rawEggs / 10);
      let looseToDeduct = rawEggs % 10;

      let newLoose = currentLoose - looseToDeduct;
      let newSaleBoxes = currentSaleBoxes - boxesToDeduct;

      // If we don't have enough loose eggs, break open a box
      if (newLoose < 0) {
        newLoose += 10; // Unpack 10 loose eggs
        newSaleBoxes -= 1; // Consume an additional box to cover it
      }

      // Prevent negative values (if someone forces an oversell)
      newLoose = Math.max(0, newLoose);
      newSaleBoxes = Math.max(0, newSaleBoxes);

      // Save the Sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([
          {
            customer_name: selectedCustomer,
            amount_boxes: calculatedBoxes, // Storing as fractional boxes per original spec
            price: finalPrice,
            status: paymentStatus,
            date: finalDate || new Date().toISOString().split('T')[0],
            secret_pass: 'abigail' // Maintain your placeholder pass requirement
          }
        ])
        .select();

      if (saleError) throw saleError;

      // Save the updated Pantry State
      const { error: updatePantryError } = await supabase
        .from('pantry_inventory')
        .insert([
          {
            boxes_for_sale: newSaleBoxes,
            boxes_personal: currentPersonalBoxes, // Personal stock untouched during a sale
            loose_eggs: newLoose
          }
        ]);

      if (updatePantryError) throw updatePantryError;

      // Update Local UI
      if (saleData && saleData.length > 0) {
        const databaseSale = saleData[0];
        const newLogEntry: SaleEntry = {
          id: databaseSale.id.toString(), 
          customerName: databaseSale.customer_name,
          amountBoxes: Number(databaseSale.amount_boxes) * 10,
          price: Number(databaseSale.price),
          status: databaseSale.status,
          date: databaseSale.date
        };

        setSalesLog([newLogEntry, ...salesLog].slice(0, 10));
        triggerDemoToast('Live Mode: Sale and Pantry updated! 💰');
      }

      // Reset form
      setEggsSoldInput('');
      setPriceOverride('');
      setIsManualPrice(false);
      setPaymentStatus('Paid');
      setSaleDate('today');
      setCustomDate('');
      
      if (customers.includes('Walk-in Customer')) {
        setSelectedCustomer('Walk-in Customer');
      }

    } catch (err: any) {
      console.error('Unexpected error tracking transaction:', err);
      alert(`Transaction Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h2 className="text-lg font-bold text-stone-900 mb-4">💰 Log a Sale</h2>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">Customer</label>
            <button 
              type="button" 
              onClick={() => setShowAddCustomer(!showAddCustomer)}
              className="text-xs text-amber-700 font-medium hover:underline"
            >
              {showAddCustomer ? 'Cancel' : '+ Add New Customer'}
            </button>
          </div>

          {!showAddCustomer ? (
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500"
            >
              <option value="" disabled>-- Select Buyer --</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          ) : (
            <form onSubmit={handleAddCustomer} className="flex space-x-2 animate-fade-in">
              <input
                type="text"
                placeholder="Enter client name"
                value={newCustomerInput}
                onChange={(e) => setNewCustomerInput(e.target.value)}
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 text-sm"
              />
              <button 
                type="submit"
                className="bg-stone-800 text-white text-xs px-4 rounded-xl hover:bg-stone-900 font-semibold"
              >
                Save
              </button>
            </form>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Eggs Sold</label>
            <input
              type="number"
              placeholder="e.g. 12"
              min="0"
              value={eggsSoldInput}
              onChange={(e) => setEggsSoldInput(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Total Price (€)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              disabled={paymentStatus === 'Gift'}
              value={priceOverride}
              onChange={(e) => {
                setPriceOverride(e.target.value);
                setIsManualPrice(true);
              }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 disabled:opacity-50 font-medium"
            />
          </div>
        </div>

        {parseInt(eggsSoldInput) > 0 && (
          <div className="mb-4 text-xs text-stone-400 bg-stone-50 p-2.5 rounded-xl border border-stone-150">
            📦 Stock reduction: <strong>{Math.floor(parseInt(eggsSoldInput) / 10)} full boxes</strong> and <strong>{parseInt(eggsSoldInput) % 10} loose eggs</strong>.
            {paymentStatus === 'Paid' && !isManualPrice && ` (Suggested at €0.50/egg)`}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Payment Type</label>
          <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-xl">
            <button
              type="button"
              onClick={() => setPaymentStatus('Paid')}
              className={`py-2 text-sm font-medium rounded-lg transition-colors ${paymentStatus === 'Paid' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus('Gift')}
              className={`py-2 text-sm font-medium rounded-lg transition-colors ${paymentStatus === 'Gift' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
            >
              Gift (Free)
            </button>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">Date of Sale</label>
          <select
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500 mb-2"
          >
            <option value="today">Today (Current Day)</option>
            <option value="other">Choose custom date...</option>
          </select>

          {saleDate === 'other' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 focus:outline-none focus:border-amber-500 animate-fade-in"
            />
          )}
        </div>

        <button 
          onClick={handleSaveSale}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-xs"
        >
          Submit Transaction
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <h3 className="text-sm font-bold text-stone-900 mb-3">📋 Recent History Ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-semibold uppercase tracking-wider">
                <th className="pb-2">Client</th>
                <th className="pb-2 text-center">Eggs Sold</th>
                <th className="pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {salesLog.map((sale) => (
                <tr key={sale.id} className="hover:bg-stone-50/50">
                  <td className="py-2.5">
                    <p className="font-medium text-stone-900">{sale.customerName}</p>
                    <p className="text-[10px] text-stone-400">{sale.date}</p>
                  </td>
                  <td className="py-2.5 text-center font-semibold">{sale.amountBoxes} eggs</td>
                  <td className="py-2.5 text-right font-bold">
                    {sale.status === 'Gift' ? (
                      <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">GIFT</span>
                    ) : (
                      `€${sale.price.toFixed(2)}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}