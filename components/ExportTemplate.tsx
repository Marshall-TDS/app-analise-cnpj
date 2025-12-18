import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Cell
} from 'recharts';
import { DataRow } from '../types';
import { getTopCapital, getTopCNAESecundary, getCapitalTrend, getGeoDistribution, getTopFinancialCNAEs } from '../services/dataService';
import { BrazilMap } from './BrazilMap';

interface ExportTemplateProps {
  data: DataRow[];
}

const COLORS = ['#dbaa3d', '#222222', '#b58d30', '#404040', '#eab308', '#525252', '#facc15', '#171717', '#ca8a04', '#737373'];

export const ExportTemplate: React.FC<ExportTemplateProps> = ({ data }) => {
  const topCapitalData = useMemo(() => getTopCapital(data), [data]);
  const topCNAEData = useMemo(() => getTopCNAESecundary(data), [data]);
  const topFinancialCNAEData = useMemo(() => getTopFinancialCNAEs(data), [data]);
  const trendData = useMemo(() => getCapitalTrend(data), [data]);
  const geoData = useMemo(() => getGeoDistribution(data), [data]);

  return (
    <div id="export-template" style={{ position: 'absolute', top: -9999, left: -9999, width: '1200px', padding: '40px', backgroundColor: 'white' }}>
      <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-[#dbaa3d]">Relatório de Análise - Marshall TDS</h2>
          <p className="text-gray-500">
             {data.length} empresas selecionadas.
             Gerado em {new Date().toLocaleDateString('pt-BR')}
          </p>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Top 10 Capital */}
          <div id="chart-capital" className="h-[400px]">
             <h3 className="font-bold mb-4 text-xl">Top {topCapitalData.length > 10 ? 10 : topCapitalData.length} - Capital Social</h3>
             <BarChart width={500} height={350} data={topCapitalData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10}} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                <Bar dataKey="value" barSize={20} isAnimationActive={false}>
                    {topCapitalData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
             </BarChart>
          </div>

          {/* Top 10 Serviços */}
           <div id="chart-services" className="h-[400px]">
             <h3 className="font-bold mb-4 text-xl">Top {topCNAEData.length > 10 ? 10 : topCNAEData.length} - Serviços</h3>
             <BarChart width={500} height={350} data={topCNAEData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10}} tickFormatter={(val) => val.length > 25 ? val.substring(0, 25) + '...' : val} />
                <Bar dataKey="value" barSize={20} isAnimationActive={false}>
                     {topCNAEData.map((entry, index) => <Cell key={index} fill={COLORS[(index+1) % COLORS.length]} />)}
                </Bar>
             </BarChart>
          </div>
      </div>

      <div className="grid grid-cols-1 mb-8">
           {/* Financial CNAEs */}
           <div id="chart-financial" className="h-[500px]">
             <h3 className="font-bold mb-4 text-xl">Top {topFinancialCNAEData.length > 10 ? 10 : topFinancialCNAEData.length} - CNAEs Financeiros</h3>
             <BarChart width={1100} height={400} data={topFinancialCNAEData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={400} tick={{fontSize: 10}} />
                <Bar dataKey="value" barSize={20} isAnimationActive={false}>
                    {topFinancialCNAEData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Bar>
             </BarChart>
          </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Map */}
         <div id="chart-map" className="h-[400px]">
             <h3 className="font-bold mb-4 text-xl">Distribuição Demográfica</h3>
             {/* Use a static placeholder or simplify map for export if interactive one is hard to capture. 
                 SVGs often capture well with html2canvas if they are inline. */}
             <div className="w-[500px] h-[350px] relative">
                <BrazilMap data={geoData} />
             </div>
         </div>

         {/* Trend */}
         <div id="chart-trend" className="h-[400px]">
             <h3 className="font-bold mb-4 text-xl">Evolução Capital Social</h3>
             <AreaChart width={500} height={350} data={trendData}>
                <defs>
                    <linearGradient id="colorValueExport" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dbaa3d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#dbaa3d" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => `R$${(val/1000000).toFixed(0)}M`} width={80} />
                <CartesianGrid strokeDasharray="3 3" />
                <Area type="monotone" dataKey="value" stroke="#dbaa3d" fillOpacity={1} fill="url(#colorValueExport)" isAnimationActive={false} />
             </AreaChart>
         </div>
      </div>

    </div>
  );
};
