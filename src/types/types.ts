export type EggVariety = 'chocolate' | 'brown' | 'beige' | 'white' | 'blue' | 'olive' | 'nato' | 'perlhuhn';

export type Tab = 'daily-log' | 'pantry' | 'sales' | 'flock' | 'transactions' | 'reports';

export interface EggCounts {
  chocolate: number;
  brown: number;
  beige: number;
  white: number;
  blue: number;
  olive: number;
  nato: number;
  perlhuhn: number;
}

export interface SaleEntry {
  id: string;
  customerName: string;
  amountBoxes: number;
  price: number;
  status: 'Paid' | 'Gift';
  date: string;
}

export interface LegacyYear {
  year: string;
  totalEggs: number;
  revenue: number;
}

export interface DBLogEntry {
  id: number;
  created_at: string;
  date: string;
  eggs_chocolate: number;
  eggs_brown: number;
  eggs_beige: number;
  eggs_white: number;
  eggs_olive: number;
  eggs_blue: number;
  eggs_nato: number;
  eggs_perlhuhn: number;
  boxes_for_sale: number;
  boxes_personal: number;
  notes: string | null;
}

export interface LegacyYearlyEntry {
  id: string;
  year: number;
  eggs_collected: number;
  eggs_sold: number;
  revenue: number;
}

export interface TransactionCategory {
  id: number;
  name: string;
  type: 'income' | 'expense';
}

export interface TransactionEntry {
  id: number;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  amount: number;
}