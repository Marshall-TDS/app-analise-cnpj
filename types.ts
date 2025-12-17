export type DataRow = Record<string, any>;

export interface ColumnMeta {
  accessorKey: string;
  header: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'list';
  uniqueValues: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  fullData?: DataRow; // Used for drilldown
}

export interface FilterState {
  id: string;
  value: string;
}

export enum ViewMode {
  TABLE = 'TABLE',
  CHARTS = 'CHARTS',
  COMPARISON = 'COMPARISON',
  LIST = 'LIST'
}

export interface DrilldownState {
  isOpen: boolean;
  title: string;
  data: DataRow[];
}