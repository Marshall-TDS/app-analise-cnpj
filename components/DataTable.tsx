import React, { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
  Row,
} from '@tanstack/react-table';
import { DataRow, ColumnMeta, ViewMode } from '../types';
import { formatCurrency } from '../services/dataService';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search, ArrowLeft, ArrowRight, Users, Building2, Download, Star, Calendar } from 'lucide-react';
import Papa from 'papaparse';

// --- Debounced Input Component ---
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
}

const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, onChange]);

  return (
    <input
      {...props}
      value={value}
      onChange={e => setValue(e.target.value)}
    />
  );
};

// --- Main Component ---
interface DataTableProps {
  data: DataRow[];
  columnsMeta: ColumnMeta[];
  onRowClick: (row: DataRow) => void;
  onSelectionChange?: (selectedRows: DataRow[]) => void;
  compact?: boolean;
  viewMode?: ViewMode;
  favorites?: Set<string>;
  onToggleFavorite?: (row: DataRow) => void;
  isFavoritesFilterActive?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({ 
    data, 
    columnsMeta, 
    onRowClick, 
    onSelectionChange, 
    compact = false, 
    viewMode = ViewMode.TABLE,
    favorites = new Set(),
    onToggleFavorite,
    isFavoritesFilterActive = false
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Reset selection when data changes significantly
  useEffect(() => {
    setRowSelection({});
  }, [data]);

  const handleExportCSV = () => {
    const rows = table.getFilteredRowModel().rows.map(r => r.original);
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'dados_filtrados.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const isFavorite = (row: DataRow) => {
      const cnpjKey = Object.keys(row).find(k => k.toUpperCase().includes('CNPJ'));
      const id = cnpjKey ? row[cnpjKey] : JSON.stringify(row);
      return favorites.has(id);
  };

  const columns = useMemo<ColumnDef<DataRow>[]>(
    () => [
       // Selection Column - Moved First
      {
        id: 'select',
        header: ({ table }) => (
          <div className="w-[30px] flex justify-center">
             <input
                type="checkbox"
                checked={table.getIsAllPageRowsSelected()}
                onChange={table.getToggleAllPageRowsSelectedHandler()}
                className="w-3.5 h-3.5 text-[#dbaa3d] bg-gray-100 border-gray-300 rounded focus:ring-[#dbaa3d] cursor-pointer"
             />
          </div>
        ),
        cell: ({ row }) => (
          <div className="w-[30px] flex justify-center" onClick={(e) => e.stopPropagation()}>
            <input
                type="checkbox"
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                onChange={row.getToggleSelectedHandler()}
                className="w-3.5 h-3.5 text-[#dbaa3d] bg-gray-100 border-gray-300 rounded focus:ring-[#dbaa3d] cursor-pointer"
             />
          </div>
        ),
        size: 30, // Reduced
        maxSize: 30,
        minSize: 30,
      },
      // Favorite Column - Moved Second
      {
        id: 'favorite',
        header: () => <Star className="w-3.5 h-3.5 text-gray-400 mx-auto" />,
        cell: ({ row }) => {
            const active = isFavorite(row.original);
            return (
                <div className="w-[30px] flex justify-center cursor-pointer" onClick={(e) => {
                    e.stopPropagation();
                    if(onToggleFavorite) onToggleFavorite(row.original);
                }}>
                    <Star className={`w-3.5 h-3.5 transition-colors ${active ? 'fill-[#dbaa3d] text-[#dbaa3d]' : 'text-gray-300 hover:text-[#dbaa3d]'}`} />
                </div>
            );
        },
        size: 30, // Reduced
        maxSize: 30,
        minSize: 30,
      },
      ...columnsMeta.map((meta) => ({
        accessorKey: meta.accessorKey,
        header: ({ column }) => {
          return (
            <div className="flex flex-col space-y-2 py-2 group">
              <button
                className="flex items-center space-x-1 font-bold text-[#222222] hover:text-[#dbaa3d] text-xs uppercase tracking-wider text-left transition-colors"
                onClick={column.getToggleSortingHandler()}
              >
                <span>{meta.header.replace(/_/g, ' ')}</span>
                {column.getIsSorted() === "asc" ? (
                  <ChevronUp className="w-3 h-3 text-[#dbaa3d]" />
                ) : column.getIsSorted() === "desc" ? (
                  <ChevronDown className="w-3 h-3 text-[#dbaa3d]" />
                ) : (
                  <ChevronsUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                )}
              </button>
            </div>
          );
        },
        cell: (info) => {
            const val = info.getValue();
            const row = info.row.original;
            
            // Custom Rendering for Socios
            if (meta.type === 'list') {
                const count = row['_socios_count'];
                return (
                    <div className="flex items-center gap-1.5">
                        <span className="bg-[#222222] text-[#dbaa3d] text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                            <Users className="w-3 h-3" /> {count}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[150px]">{String(val).substring(0, 20)}...</span>
                    </div>
                );
            }

            // Custom Rendering for Currency
            if (meta.type === 'currency') {
                 return <span className="font-mono text-[#222222] font-semibold bg-[#dbaa3d]/10 px-1.5 py-0.5 rounded">{String(val)}</span>;
            }

            return <span className="text-sm text-slate-600 block truncate max-w-[200px]" title={String(val)}>{String(val ?? '-')}</span>;
        }
      }))
    ],
    [columnsMeta, favorites, onToggleFavorite]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
        pagination: {
            pageSize: compact ? 10 : 20,
        }
    }
  });

  // Notify parent of selection changes
  useEffect(() => {
     if (onSelectionChange) {
         const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
         onSelectionChange(selectedRows);
     }
  }, [rowSelection, table, onSelectionChange]);

  // Mobile / List Card Render Helper
  // Accepts Row<DataRow> so we can access getIsSelected()
  const renderCard = (row: Row<DataRow>, isCompactListMode = false) => {
      const rowData = row.original;
      
      const razaoSocial = Object.keys(rowData).find(k => k.toUpperCase().includes('RAZAO') || k.toUpperCase().includes('NOME'));
      const cnpj = Object.keys(rowData).find(k => k.toUpperCase().includes('CNPJ'));
      const capital = Object.keys(rowData).find(k => k.toUpperCase().includes('CAPITAL'));
      const uf = rowData['_uf'];
      const date = Object.keys(rowData).find(k => k.toUpperCase().includes('DATA'));
      
      const title = razaoSocial ? rowData[razaoSocial] : 'Empresa Sem Nome';
      const subtitle = cnpj ? rowData[cnpj] : '';
      
      // Formatting Capital for List View
      let money = capital ? rowData[capital] : null;
      if (money && isCompactListMode) {
          // If it's just a raw number, format it
          if (typeof money === 'number') {
              money = formatCurrency(money);
          } else if (typeof money === 'string' && !money.includes('R$')) {
              // Try to parse if it looks like a number
              const parsed = parseFloat(money);
              if (!isNaN(parsed)) money = formatCurrency(parsed);
          }
      }

      if (isCompactListMode) {
        return (
            <div 
                onClick={() => onRowClick(rowData)}
                className="bg-white border-b border-gray-100 p-4 hover:bg-gray-50 flex items-center justify-between cursor-pointer group"
            >
               <div className="flex items-center gap-3 overflow-hidden">
                   {/* Selection Checkbox */}
                   <div onClick={(e) => e.stopPropagation()}>
                       <input
                            type="checkbox"
                            checked={row.getIsSelected()}
                            disabled={!row.getCanSelect()}
                            onChange={row.getToggleSelectedHandler()}
                            className="w-4 h-4 text-[#dbaa3d] bg-gray-100 border-gray-300 rounded focus:ring-[#dbaa3d] cursor-pointer"
                        />
                   </div>

                   {/* Icon */}
                   <div className="bg-gray-100 p-2 rounded-full flex-shrink-0 group-hover:bg-[#dbaa3d]/20 transition-colors">
                       <Building2 className="w-5 h-5 text-gray-500 group-hover:text-[#dbaa3d]" />
                   </div>

                   {/* Content */}
                   <div className="min-w-0 flex-1">
                       <h4 className="font-bold text-[#222222] text-sm truncate">{title}</h4>
                       <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                           <span className="font-mono">{subtitle}</span>
                           {uf && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-bold">{uf}</span>}
                       </div>
                   </div>
               </div>

               {/* Right Side Info */}
               <div className="flex items-center gap-4 pl-2">
                    <div className="text-right">
                            {money ? (
                                <span className="block font-bold text-[#222222] text-sm">{money}</span>
                            ) : (
                                <span className="text-xs text-gray-400">-</span>
                            )}
                            {rowData['_socios_count'] > 0 && (
                                <span className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-1">
                                    <Users className="w-3 h-3" /> {rowData['_socios_count']}
                                </span>
                            )}
                    </div>
                    {/* Favorite Star */}
                    {onToggleFavorite && (
                        <div 
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(rowData); }}
                            className="p-1 cursor-pointer"
                        >
                            <Star className={`w-5 h-5 ${isFavorite(rowData) ? 'fill-[#dbaa3d] text-[#dbaa3d]' : 'text-gray-300 hover:text-[#dbaa3d]'}`} />
                        </div>
                    )}
               </div>
            </div>
        )
      }

      // Default Card View
      return (
        <div 
            onClick={() => onRowClick(rowData)}
            className="bg-white rounded-lg p-4 shadow-sm border-l-4 border-[#dbaa3d] hover:shadow-md transition-shadow active:bg-gray-50 relative"
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="font-bold text-[#222222] text-sm line-clamp-2">{title}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{subtitle}</p>
                </div>
                {onToggleFavorite && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(rowData); }}
                        className="p-1"
                    >
                         <Star className={`w-4 h-4 ${isFavorite(rowData) ? 'fill-[#dbaa3d] text-[#dbaa3d]' : 'text-gray-300'}`} />
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                {money && (
                    <div className="bg-[#FAFAFA] p-2 rounded border border-gray-100">
                        <span className="block text-gray-400 mb-0.5">Capital Social</span>
                        <span className="font-bold text-[#222222]">{money}</span>
                    </div>
                )}
                 <div className="bg-[#FAFAFA] p-2 rounded border border-gray-100">
                        <span className="block text-gray-400 mb-0.5">Sócios</span>
                        <div className="flex items-center gap-1 font-semibold text-[#222222]">
                            <Users className="w-3 h-3 text-[#dbaa3d]" />
                            {rowData['_socios_count'] || 0}
                        </div>
                    </div>
            </div>
             <div className="mt-3 text-center text-xs font-medium text-[#dbaa3d] flex items-center justify-center gap-1">
                Ver Detalhes Completos
            </div>
        </div>
      );
  };

  const renderEmptyState = () => {
      if (isFavoritesFilterActive && data.length === 0) {
          return (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="bg-gray-100 p-4 rounded-full">
                    <Star className="w-10 h-10 text-[#dbaa3d]" />
                </div>
                <div className="text-center max-w-sm">
                    <h3 className="text-lg font-bold text-[#222222] mb-1">Você ainda não tem favoritos</h3>
                    <p className="text-gray-500 text-sm">
                        Para adicionar empresas à sua lista de favoritos, clique no ícone de estrela <Star className="w-3 h-3 inline text-gray-400" /> na tabela de dados ou na ficha da empresa.
                    </p>
                </div>
              </div>
          );
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
            <Search className="w-8 h-8 text-gray-300" />
            <p className="text-gray-500">Nenhum registro encontrado.</p>
        </div>
      );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#FAFAFA]">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
           <h2 className={`font-bold text-[#222222] ${compact ? 'text-md' : 'text-lg'}`}>Empresas</h2>
           <span className="text-xs font-bold px-2.5 py-1 bg-[#222222] text-[#dbaa3d] rounded shadow-sm">
            {table.getFilteredRowModel().rows.length.toLocaleString('pt-BR')}
           </span>
           {Object.keys(rowSelection).length > 0 && (
             <span className="text-xs font-bold text-[#dbaa3d] ml-2">
                {Object.keys(rowSelection).length} selecionados
             </span>
           )}
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-[#dbaa3d]" />
                </div>
                <DebouncedInput
                    type="text"
                    value={globalFilter ?? ''}
                    onChange={(value) => setGlobalFilter(String(value))}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-transparent placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#dbaa3d]/20 focus:border-[#dbaa3d] transition-all shadow-sm"
                    placeholder="Pesquisar registros..."
                />
            </div>
            
            {!compact && (
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#222222] hover:border-[#dbaa3d] transition-colors"
                    title="Exportar CSV"
                >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Exportar</span>
                </button>
            )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-gray-50">
        
        {/* VIEW: TABLE (Desktop only) */}
        {viewMode === ViewMode.TABLE && (
            <>
                <table className="hidden md:table min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                        <th
                            key={header.id}
                            scope="col"
                            className={`px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider bg-gray-50 border-b border-gray-200 ${header.id === 'select' || header.id === 'favorite' ? 'w-[30px] text-center px-1' : 'min-w-[180px]'}`}
                        >
                            {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                                )}
                        </th>
                        ))}
                    </tr>
                    ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                        <tr 
                            key={row.id} 
                            className={`transition-colors cursor-pointer group ${row.getIsSelected() ? 'bg-[#dbaa3d]/10' : 'hover:bg-gray-50'}`}
                            onClick={() => onRowClick(row.original)}
                        >
                        {row.getVisibleCells().map((cell) => (
                            <td
                            key={cell.id}
                            className={`px-6 py-3 whitespace-nowrap text-sm text-[#222222] max-w-xs ${cell.column.id === 'select' || cell.column.id === 'favorite' ? 'w-[30px] text-center px-1' : ''}`}
                            >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                        </tr>
                    ))
                    ) : (
                    <tr>
                        <td
                        colSpan={columns.length}
                        className="px-6 py-0 text-center text-gray-500"
                        >
                            {renderEmptyState()}
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
                {/* Fallback to Cards on Mobile even if in TABLE mode */}
                <div className="md:hidden p-4 space-y-3">
                     {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <React.Fragment key={row.id}>
                                {renderCard(row)}
                            </React.Fragment>
                        ))
                     ) : (
                         renderEmptyState()
                     )}
                </div>
            </>
        )}

        {/* VIEW: LIST (Mobile optimized list, also on Desktop if selected) */}
        {viewMode === ViewMode.LIST && (
            <div className="w-full bg-white min-h-full">
                 {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                        <React.Fragment key={row.id}>
                            {renderCard(row, true)}
                        </React.Fragment>
                    ))
                 ) : (
                     renderEmptyState()
                 )}
            </div>
        )}

      </div>

      {/* Pagination */}
      <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-10 gap-3">
        <div className="flex items-center gap-2">
             <span className="text-sm text-gray-600">
                Página <span className="font-bold text-[#dbaa3d]">{table.getState().pagination.pageIndex + 1}</span> de{' '}
                <span className="font-bold text-[#222222]">{table.getPageCount()}</span>
            </span>
        </div>
        <div className="flex items-center gap-2">
            <button
                className="p-2 rounded-lg border-2 border-gray-300 text-gray-700 bg-white hover:bg-[#222222] hover:text-[#dbaa3d] hover:border-[#222222] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                title="Página Anterior"
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
            <button
                className="p-2 rounded-lg border-2 border-gray-300 text-gray-700 bg-white hover:bg-[#222222] hover:text-[#dbaa3d] hover:border-[#222222] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                title="Próxima Página"
            >
                <ArrowRight className="w-4 h-4" />
            </button>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
              className="ml-2 block pl-3 pr-8 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-black rounded-lg cursor-pointer bg-transparent text-[#222222] font-medium shadow-sm hover:bg-gray-50"
            >
              {[10, 20, 50, 100].map(pageSize => (
                <option key={pageSize} value={pageSize} className="bg-white text-gray-700">
                  Mostrar {pageSize}
                </option>
              ))}
            </select>
        </div>
      </div>
    </div>
  );
};