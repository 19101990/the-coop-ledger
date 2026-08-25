export type EggVariety = 'chocolate' | 'brown' | 'beige' | 'blue' | 'olive' | 'nato' | 'perlhuhn';

export type Tab = 'daily-log' | 'pantry' | 'sales' | 'flock' | 'reports';

export interface EggCounts {
  chocolate: number;
  brown: number;
  beige: number;
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