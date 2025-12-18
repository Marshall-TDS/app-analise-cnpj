import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import { DataRow, ColumnMeta } from '../types';
import { getTopCapital, getTopCNAESecundary, getCapitalTrend, getGeoDistribution, getTopFinancialCNAEs } from '../services/dataService';
import { DollarSign, Activity, Map, LineChart as LineChartIcon, Loader2 } from 'lucide-react';
import { BrazilMap } from './BrazilMap';
import { StateDrilldown } from './StateDrilldown';
import { Modal, CompanyDetail } from './Modal';

interface ChartsProps {
  data: DataRow[];
  columnsMeta: ColumnMeta[];
  onBarClick: (data: any, type: string) => void;
}

// Gold, Black, Dark Grey, Light Gold...
const COLORS = ['#dbaa3d', '#222222', '#b58d30', '#404040', '#eab308', '#525252', '#facc15', '#171717', '#ca8a04', '#737373'];

// --- Custom Tooltip Component ---
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

export const Charts: React.FC<ChartsProps> = ({ data, columnsMeta, onBarClick }) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Drilldown Modal States
  const [activeModal, setActiveModal] = useState<{ type: 'STATE' | 'COMPANY', data: any } | null>(null);

  // --- Aggregations ---
  // Memoize based on data (which is now already filtered by parent)
  const topCapitalData = useMemo(() => getTopCapital(data), [data]);
  const topCNAEData = useMemo(() => getTopCNAESecundary(data), [data]);
  const topFinancialCNAEData = useMemo(() => getTopFinancialCNAEs(data), [data]);
  const trendData = useMemo(() => getCapitalTrend(data), [data]);
  const geoData = useMemo(() => getGeoDistribution(data), [data]);

  // --- Handlers ---
  const handleStateClick = (uf: string) => {
      // Filter data for this state
      const stateData = data.filter(row => {
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

  return (
    <div className="space-y-6 pb-12 relative">
      
      {/* Row 1: Top 10s (Bar Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto relative z-0">
        {/* Chart 1: Top Capital Social */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-[500px] lg:h-[450px]">
          <div className="flex items-center justify-between mb-2 lg:mb-6">
            <div>
                 <h3 className="font-bold text-[#222222] flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5 text-[#dbaa3d]" />
                    Top {topCapitalData.length > 10 ? 10 : topCapitalData.length} - Capital Social
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
                    Top {topCNAEData.length > 10 ? 10 : topCNAEData.length} - Serviços
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
                    Top {topFinancialCNAEData.length > 10 ? 10 : topFinancialCNAEData.length} - CNAEs Financeiros Mais Comuns
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