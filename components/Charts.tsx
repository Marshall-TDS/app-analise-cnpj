import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import { DataRow, ColumnMeta } from '../types';
import { getTopCapital, getTopCNAESecundary, getCapitalTrend, getGeoDistribution, getTopFinancialCNAEs } from '../services/dataService';
import { DollarSign, Activity, Map, LineChart as LineChartIcon, Search, Filter, ChevronDown, ChevronUp, X, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';
import { BrazilMap } from './BrazilMap';
import { StateDrilldown } from './StateDrilldown';
import { Modal, CompanyDetail } from './Modal';
import { CNAE_LIST, NATUREZA_JURIDICA_LIST } from '../constants';

interface ChartsProps {
  data: DataRow[];
  columnsMeta: ColumnMeta[];
  onBarClick: (data: any, type: string) => void;
}

// Gold, Black, Dark Grey, Light Gold...
const COLORS = ['#dbaa3d', '#222222', '#b58d30', '#404040', '#eab308', '#525252', '#facc15', '#171717', '#ca8a04', '#737373'];

// --- Custom Tooltip Component (Moved outside to prevent re-renders/errors) ---
const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      // Try to get fullData from the payload structure Recharts provides
      const fullData = dataPoint.fullData || (dataPoint.payload ? dataPoint.payload.fullData : null);
      
      let razaoSocial = '';
      let cnpj = '';
      let capital = '';
      
      if (fullData) {
         // Find Razão Social / Nome
         const razaoKey = Object.keys(fullData).find(k => k.toUpperCase().includes('RAZAO') || k.toUpperCase().includes('NOME'));
         if (razaoKey) razaoSocial = fullData[razaoKey];

         // Find CNPJ
         const cnpjKey = Object.keys(fullData).find(k => k.toUpperCase().includes('CNPJ'));
         if (cnpjKey) cnpj = fullData[cnpjKey];
         
         // Find Capital (Formatted) if available
         const capitalKey = Object.keys(fullData).find(k => k.toUpperCase().includes('CAPITAL'));
         if (capitalKey) capital = fullData[capitalKey];
      }

      // Formatting value based on unit
      let displayValue = '';
      if (unit === 'R$') {
          displayValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value);
      } else if (unit === '%') {
          displayValue = `${payload[0].value}`;
      } else if (unit === 'CNAEs') {
          displayValue = `${Number(payload[0].value).toLocaleString()} serviços`;
      } else {
          displayValue = `${Number(payload[0].value).toLocaleString()} empresas`;
      }

      return (
        <div className="bg-[#222222] p-4 border border-[#dbaa3d] shadow-xl rounded-lg max-w-xs z-50">
          <p className="text-xs font-bold text-[#dbaa3d] mb-2 uppercase tracking-wide border-b border-gray-700 pb-1">
             {label || dataPoint.name}
          </p>
          
          {razaoSocial ? (
            <div className="space-y-2 mb-3">
                 <div>
                    <span className="text-[10px] text-gray-500 uppercase block">Razão Social</span>
                    <p className="text-xs text-white font-bold leading-tight">{razaoSocial}</p>
                 </div>
                 {cnpj && (
                     <div>
                        <span className="text-[10px] text-gray-500 uppercase block">CNPJ</span>
                        <p className="text-xs text-gray-300 font-mono">{cnpj}</p>
                     </div>
                 )}
            </div>
          ) : (
             <p className="text-[10px] text-gray-500 mb-2 italic">Dados agregados (Estado/Ano)</p>
          )}

          <div className="mt-2 pt-2 border-t border-gray-700">
             <span className="text-[10px] text-gray-400 block mb-0.5">
                {unit === 'R$' ? 'Capital Social Total' : 
                 unit === 'CNAEs' ? 'Qtd. Serviços Secundários' : 'Valor'}
             </span>
             <p className="text-lg text-[#dbaa3d] font-bold">{displayValue}</p>
          </div>
        </div>
      );
    }
    return null;
  };

// --- Generic Multi Select Component ---
interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selected, onChange, placeholder = "Selecione..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        const lower = search.toLowerCase();
        return options.filter(opt => 
            opt.value.toLowerCase().includes(lower) || opt.label.toLowerCase().includes(lower)
        );
    }, [search, options]);

    const toggleSelection = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(s => s !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-transparent cursor-pointer min-h-[38px] flex flex-wrap items-center gap-1 focus-within:border-[#dbaa3d] focus-within:ring-1 focus-within:ring-[#dbaa3d]"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length === 0 ? (
                    <span className="text-gray-400">{placeholder}</span>
                ) : (
                    selected.map(val => (
                        <span key={val} className="bg-[#222222] text-[#dbaa3d] px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                            {val}
                            <span 
                                className="cursor-pointer hover:text-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelection(val);
                                }}
                            >
                                <X className="w-3 h-3" />
                            </span>
                        </span>
                    ))
                )}
                <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 flex flex-col">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white rounded-t-lg">
                        <input 
                            type="text" 
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#dbaa3d] bg-transparent"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => {
                                const isSelected = selected.includes(opt.value);
                                return (
                                    <div 
                                        key={opt.value}
                                        className={`px-2 py-2 text-xs cursor-pointer rounded flex items-start gap-2 ${isSelected ? 'bg-[#dbaa3d]/10' : 'hover:bg-gray-50'}`}
                                        onClick={() => toggleSelection(opt.value)}
                                    >
                                        <div className="mt-0.5 text-[#dbaa3d]">
                                             {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300" />}
                                        </div>
                                        <div>
                                            <span className="font-bold text-[#222222] block">{opt.value}</span>
                                            {opt.label !== opt.value && <span className="text-gray-600">{opt.label}</span>}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-500">Nenhum resultado encontrado.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Charts: React.FC<ChartsProps> = ({ data, columnsMeta, onBarClick }) => {
  // UI Filters State
  const [selectedCnaes, setSelectedCnaes] = useState<string[]>([]);
  const [selectedUfs, setSelectedUfs] = useState<string[]>([]);
  const [selectedNaturezas, setSelectedNaturezas] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Loading / Processing State
  const [isComputing, setIsComputing] = useState(false);

  // Deferred Applied Filters
  const [appliedFilters, setAppliedFilters] = useState({
      cnaes: [] as string[],
      ufs: [] as string[],
      naturezas: [] as string[]
  });

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Effect to trigger calculation with delay for visual feedback
  useEffect(() => {
    setIsComputing(true);
    const timeout = setTimeout(() => {
        setAppliedFilters({
            cnaes: selectedCnaes,
            ufs: selectedUfs,
            naturezas: selectedNaturezas
        });
        setIsComputing(false);
    }, 100); // Small delay to allow React to render the loading state
    return () => clearTimeout(timeout);
  }, [selectedCnaes, selectedUfs, selectedNaturezas]);

  // Drilldown Modal States
  const [activeModal, setActiveModal] = useState<{ type: 'STATE' | 'COMPANY', data: any } | null>(null);

  // --- Prepare Options (Memoized) ---
  const options = useMemo(() => {
    // CNAE Options from Constant
    const cnaes = CNAE_LIST.map(c => ({ label: c.desc, value: c.code }));

    // UF Options from Data
    const ufsSet = new Set<string>();
    data.forEach(row => {
        let uf = row['_uf'];
        if (!uf) {
             const ufKey = Object.keys(row).find(k => k.toUpperCase() === 'UF' || k.toUpperCase() === 'ESTADO');
             if (ufKey) uf = row[ufKey];
        }
        if (uf && uf.length === 2) ufsSet.add(uf);
    });
    const ufs = Array.from(ufsSet).sort().map(uf => ({ label: uf, value: uf }));

    // Natureza Juridica Options from Constant
    const naturezas = NATUREZA_JURIDICA_LIST.map(n => ({ label: n, value: n }));

    return { cnaes, ufs, naturezas };
  }, [data]);

  // --- Filter Logic (Uses appliedFilters for deferred execution) ---
  const filteredData = useMemo(() => {
    let res = data;
    const { cnaes, ufs, naturezas } = appliedFilters;

    // Unified CNAE Filter (Checks both Primary and Secondary)
    if (cnaes.length > 0) {
        res = res.filter(row => {
            const p = row['_cnae_principal'] ? String(row['_cnae_principal']) : '';
            const sList = Array.isArray(row['_cnae_sec_list']) ? row['_cnae_sec_list'] : [];

            // Check if ANY selected code is present in Primary OR Secondary
            return cnaes.some(code => {
                const cleanCode = code.replace(/\D/g, ''); 
                const cleanP = p.replace(/\D/g, '');
                
                // Check primary
                if (cleanP.includes(cleanCode)) return true;
                
                // Check secondary list
                return sList.some((sec: string) => sec.replace(/\D/g, '').includes(cleanCode));
            });
        });
    }

    // UF Filter
    if (ufs.length > 0) {
        res = res.filter(row => {
             let uf = row['_uf'];
             if (!uf) {
                 const ufKey = Object.keys(row).find(k => k.toUpperCase() === 'UF' || k.toUpperCase() === 'ESTADO');
                 if (ufKey) uf = row[ufKey];
             }
             return ufs.includes(uf);
        });
    }

    // Natureza Juridica Filter
    if (naturezas.length > 0) {
        res = res.filter(row => {
            // Try to find the Natureza key
            const natKey = Object.keys(row).find(k => k.toUpperCase().includes('NATUREZA') || k.toUpperCase().includes('JURIDICA'));
            if (!natKey) return false;
            
            const rowValue = String(row[natKey]).toUpperCase();
            return naturezas.some(n => {
                // Extract code from option (e.g. "206-2") to match loosely
                const code = n.split('-')[0].trim(); 
                return rowValue.includes(code);
            });
        });
    }

    return res;
  }, [data, appliedFilters]);

  // --- Aggregations ---
  const topCapitalData = useMemo(() => getTopCapital(filteredData), [filteredData]);
  const topCNAEData = useMemo(() => getTopCNAESecundary(filteredData), [filteredData]);
  const topFinancialCNAEData = useMemo(() => getTopFinancialCNAEs(filteredData), [filteredData]);
  const trendData = useMemo(() => getCapitalTrend(filteredData), [filteredData]);
  const geoData = useMemo(() => getGeoDistribution(filteredData), [filteredData]);

  // --- Handlers ---
  const handleStateClick = (uf: string) => {
      // Filter data for this state
      const stateData = filteredData.filter(row => {
          let rUf = row['_uf'];
           if (!rUf) {
                const ufKey = Object.keys(row).find(k => k.toUpperCase() === 'UF' || k.toUpperCase() === 'ESTADO');
                if (ufKey) rUf = row[ufKey];
           }
           return rUf === uf;
      });
      setActiveModal({ type: 'STATE', data: { uf, rows: stateData } });
  };

  const handleBarClickInternal = (data: any) => {
       if (data && data.activePayload && data.activePayload[0]) {
           const fullRow = data.activePayload[0].payload.fullData;
           if (fullRow) {
               setActiveModal({ type: 'COMPANY', data: fullRow });
           }
       }
  }

  const handleClearFilters = () => {
      setSelectedCnaes([]);
      setSelectedUfs([]);
      setSelectedNaturezas([]);
  };

  return (
    <div className="space-y-6 pb-12 relative">
      
      {/* Loading Overlay for Charts Area */}
      {isComputing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl transition-all duration-300">
              <Loader2 className="w-10 h-10 text-[#dbaa3d] animate-spin mb-2" />
              <span className="text-sm font-bold text-[#222222]">Processando dados...</span>
          </div>
      )}

      {/* Accordion Filter Control */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible transition-all relative z-40">
        <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-xl"
        >
            <div className="flex items-center gap-2 text-[#dbaa3d] font-bold">
                <Filter className="w-5 h-5" />
                <span>Filtros Avançados</span>
                 <div className="ml-2 text-xs text-gray-500 font-mono bg-white border border-gray-200 px-2 py-0.5 rounded">
                     {/* Hide text on mobile, just show count */}
                    <span className="hidden sm:inline">{filteredData.length} registros filtrados</span>
                    <span className="sm:hidden">{filteredData.length}</span>
                </div>
            </div>
            {isFilterOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        
        {isFilterOpen && (
            <div className="p-4 border-t border-gray-200 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {/* Unified CNAE Filter */}
                    <div className="relative z-50">
                         <span className="text-xs font-semibold text-gray-500 mb-1 block">CNAEs (Principal e Secundários)</span>
                         <MultiSelect 
                            options={options.cnaes}
                            selected={selectedCnaes}
                            onChange={setSelectedCnaes}
                            placeholder="Buscar e selecionar CNAEs..."
                         />
                    </div>

                    {/* Natureza Juridica - MultiSelect */}
                    <div className="relative z-40">
                         <span className="text-xs font-semibold text-gray-500 mb-1 block">Natureza Jurídica</span>
                         <MultiSelect 
                            options={options.naturezas}
                            selected={selectedNaturezas}
                            onChange={setSelectedNaturezas}
                            placeholder="Selecione as naturezas..."
                         />
                    </div>

                    {/* UF - MultiSelect */}
                     <div className="relative z-30">
                         <span className="text-xs font-semibold text-gray-500 mb-1 block">Estados (UF)</span>
                         <MultiSelect 
                            options={options.ufs}
                            selected={selectedUfs}
                            onChange={setSelectedUfs}
                            placeholder="Selecione os estados..."
                         />
                    </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-gray-100">
                     <button
                        onClick={handleClearFilters}
                        disabled={selectedCnaes.length === 0 && selectedUfs.length === 0 && selectedNaturezas.length === 0}
                        className={`text-xs font-bold px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                            selectedCnaes.length === 0 && selectedUfs.length === 0 && selectedNaturezas.length === 0
                            ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                            : 'text-red-600 hover:bg-red-50 cursor-pointer border border-red-200'
                        }`}
                    >
                        <Trash2 className="w-4 h-4" />
                        Limpar Filtros
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Row 1: Top 10s (Bar Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto relative z-0">
        {/* Chart 1: Top Capital Social */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px] lg:h-[450px]">
          <div className="flex items-center justify-between mb-2 lg:mb-6">
            <div>
                 <h3 className="font-bold text-[#222222] flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-[#dbaa3d]" />
                    Top 10 - Capital Social
                </h3>
                <p className="text-sm text-gray-500 mt-1">Empresas com maior investimento declarado</p>
            </div>
          </div>
          
          {/* Scrollable Container with Min Width for Horizontal Scroll */}
          <div className="flex-1 min-h-0 w-full overflow-x-auto pb-2">
            <div className="h-full min-w-[600px] lg:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={topCapitalData}
                    // On mobile, layout="horizontal" (Vertical Bars). On Desktop, layout="vertical" (Horizontal Bars)
                    layout={isMobile ? "horizontal" : "vertical"}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    onClick={handleBarClickInternal}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    {isMobile ? (
                        <>
                            {/* Mobile: Vertical Bars (Names on X, Values on Y) */}
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 9, fill: '#404040'}} 
                                interval={0}
                                tickFormatter={(val) => val.length > 10 ? val.substring(0, 7) + '...' : val}
                            />
                            <YAxis type="number" hide />
                        </>
                    ) : (
                        <>
                            {/* Desktop: Horizontal Bars (Values on X, Names on Y) */}
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#404040'}} />
                        </>
                    )}
                    
                    <Tooltip content={<CustomTooltip unit="R$" />} cursor={{fill: '#fcfcfc'}} />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20} cursor="pointer">
                        {topCapitalData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Top CNAEs Secundarios */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px] lg:h-[450px]">
            <div className="flex items-center justify-between mb-2 lg:mb-6">
             <div>
                <h3 className="font-bold text-[#222222] flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-[#dbaa3d]" />
                    Top 10 - Serviços
                </h3>
                <p className="text-sm text-gray-500 mt-1">Empresas com o maior número de serviços</p>
            </div>
          </div>
          
          {/* Scrollable Container with Min Width */}
          <div className="flex-1 min-h-0 w-full overflow-x-auto pb-2">
            <div className="h-full min-w-[600px] lg:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={topCNAEData}
                    layout="horizontal"
                    margin={{ top: 20, right: 10, left: 0, bottom: 20 }}
                    onClick={handleBarClickInternal}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="name" 
                        tick={{fontSize: 9, fill: '#404040'}} 
                        interval={0}
                        tickFormatter={(val) => val.length > 10 ? val.substring(0, 7) + '...' : val}
                    />
                    <YAxis tick={{fontSize: 10, fill: '#404040'}} width={30} />
                    <Tooltip content={<CustomTooltip unit="CNAEs" />} cursor={{fill: '#fcfcfc'}} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} cursor="pointer">
                        {topCNAEData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Top 10 Financial CNAEs (Full Width) */}
      <div className="w-full h-[500px] lg:h-[600px] bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2 lg:mb-6">
             <div>
                <h3 className="font-bold text-[#222222] flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-[#dbaa3d]" />
                    Top 10 - CNAEs Financeiros Mais Comuns
                </h3>
                <p className="text-sm text-gray-500 mt-1">Classificação baseada na frequência de atividades (Principal e Secundárias)</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 w-full overflow-x-auto pb-2">
            <div className="h-full min-w-[800px] lg:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={topFinancialCNAEData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{fontSize: 10, fill: '#404040'}} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={280} 
                            tick={{fontSize: 10, fill: '#404040'}} 
                            tickFormatter={(val) => val.length > 45 ? val.substring(0, 45) + '...' : val}
                        />
                        <Tooltip 
                            content={<CustomTooltip unit="empresas" />} 
                            cursor={{fill: '#fcfcfc'}}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                             {topFinancialCNAEData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>

      {/* Row 2: Geographic Map (Full Width) */}
      <div className="w-full h-[500px] lg:h-[700px] bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="font-bold text-[#222222] flex items-center gap-2 text-lg">
                    <Map className="w-5 h-5 text-[#dbaa3d]" />
                    Mapa do Brasil
                </h3>
                <p className="text-sm text-gray-500 mt-1">Distribuição geográfica</p>
            </div>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center p-0 overflow-hidden">
                <BrazilMap 
                data={geoData} 
                onStateClick={handleStateClick}
                />
        </div>
      </div>

      {/* Row 3: Trend Over Time (Full Width) */}
      <div className="w-full h-[400px] bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="font-bold text-[#222222] flex items-center gap-2 text-lg">
                    <LineChartIcon className="w-5 h-5 text-[#dbaa3d]" />
                    Evolução Capital Social
                </h3>
                <p className="text-sm text-gray-500 mt-1">Por ano de abertura</p>
            </div>
        </div>
        
        {/* Scrollable Container with Min Width */}
        <div className="flex-1 min-h-0 w-full overflow-x-auto pb-2">
            <div className="h-full min-w-[800px] lg:min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={trendData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dbaa3d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#dbaa3d" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                        <YAxis tick={{fontSize: 10}} tickFormatter={(val) => `R$${(val/1000000).toFixed(0)}M`} width={50} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <Tooltip content={<CustomTooltip unit="R$" />} />
                        <Area type="monotone" dataKey="value" stroke="#dbaa3d" fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Internal Modals */}
      <Modal
        isOpen={!!activeModal}
        onClose={() => setActiveModal(null)}
        title={activeModal?.type === 'STATE' ? `Empresas - ${activeModal.data.uf}` : 'Detalhes da Empresa'}
      >
        {activeModal?.type === 'STATE' && (
            <StateDrilldown 
                uf={activeModal.data.uf}
                data={activeModal.data.rows}
                columnsMeta={columnsMeta}
                onClose={() => setActiveModal(null)}
            />
        )}
        {activeModal?.type === 'COMPANY' && (
            <CompanyDetail company={activeModal.data} />
        )}
      </Modal>

    </div>
  );
};