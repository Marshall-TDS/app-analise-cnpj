import React, { useState } from 'react';
import { DataRow, ColumnMeta } from '../types';
import { DataTable } from './DataTable';
import { CompanyDetail } from './Modal';
import { ArrowLeft, MapPin } from 'lucide-react';

interface StateDrilldownProps {
    uf: string;
    data: DataRow[];
    columnsMeta: ColumnMeta[];
    onClose: () => void;
}

export const StateDrilldown: React.FC<StateDrilldownProps> = ({ uf, data, columnsMeta, onClose }) => {
    const [selectedCompany, setSelectedCompany] = useState<DataRow | null>(null);

    if (selectedCompany) {
        return (
            <div className="flex flex-col h-[70vh]">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                    <button 
                        onClick={() => setSelectedCompany(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Voltar para lista"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h3 className="font-bold text-lg text-[#222222]">Detalhes da Empresa</h3>
                        <p className="text-xs text-gray-500">Visualizando registro de {uf}</p>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                    <CompanyDetail company={selectedCompany} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[70vh]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="bg-[#dbaa3d] p-2 rounded-lg text-[#222222]">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                         <h3 className="font-bold text-lg text-[#222222]">Empresas em {uf}</h3>
                         <p className="text-xs text-gray-500">{data.length} registros encontrados</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg">
                <DataTable 
                    data={data} 
                    columnsMeta={columnsMeta} 
                    onRowClick={(row) => setSelectedCompany(row)}
                    compact={true}
                />
            </div>
        </div>
    );
};