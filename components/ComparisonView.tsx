import React from 'react';
import { DataRow, ColumnMeta } from '../types';
import { X, Building2, Check, Minus } from 'lucide-react';
import { formatCurrency } from '../services/dataService';

interface ComparisonViewProps {
    selectedCompanies: DataRow[];
    columnsMeta: ColumnMeta[];
    onClose: () => void;
    onRemove: (company: DataRow) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ selectedCompanies, columnsMeta, onClose, onRemove }) => {
    
    // Identificar a chave do nome para o header
    const getName = (row: DataRow) => {
        const nameKey = Object.keys(row).find(k => 
            !k.startsWith('_') && (k.toUpperCase().includes('RAZAO') || k.toUpperCase().includes('NOME'))
        ) || Object.keys(row)[0];
        return row[nameKey];
    }

    // Função auxiliar para buscar valor baseado em palavras-chave (insensitive)
    const findValue = (row: DataRow, keywords: string[], type: 'text' | 'currency' | 'list' = 'text') => {
        // Tenta achar nas chaves processadas primeiro (começam com _)
        if (keywords.includes('CNAE PRIMARIO') && row['_cnae_principal']) return row['_cnae_principal'];
        if (keywords.includes('CNAE SECUNDARIO') && row['_cnae_sec_list']) return row['_cnae_sec_list'].join('; ');
        if (keywords.includes('SOCIOS') && row['_socios_list']) return row['_socios_list'].join('; ');
        if (keywords.includes('CAPITAL') && row['_raw_capital']) return formatCurrency(row['_raw_capital']);

        // Busca nas chaves originais
        const key = Object.keys(row).find(k => {
             const upper = k.toUpperCase();
             return keywords.some(w => upper.includes(w));
        });

        if (!key) return '-';
        return row[key];
    };

    // Definição das Linhas de Comparação
    const comparisonRows = [
        { label: 'CNPJ', keywords: ['CNPJ'] },
        { label: 'Razão Social', keywords: ['RAZAO', 'NOME'] },
        { label: 'Matriz/Filial', keywords: ['MATRIZ', 'FILIAL', 'IDENTIFICADOR'] },
        { label: 'Natureza Jurídica', keywords: ['NATUREZA', 'JURIDICA'] },
        { label: 'Capital Social', keywords: ['CAPITAL'], type: 'currency' as const },
        { label: 'Porte', keywords: ['PORTE'] },
        { label: 'CNAE Primário', keywords: ['CNAE PRIMARIO', 'PRINCIPAL'] },
        { label: 'CNAEs Secundários', keywords: ['CNAE SECUNDARIO', 'SECUNDARIA'] },
        { label: 'UF', keywords: ['UF', 'ESTADO'] },
        { label: 'E-mail', keywords: ['EMAIL', 'CORREIO'] },
        { label: 'Telefone', keywords: ['TELEFONE', 'TEL'] },
        { label: 'Sócios', keywords: ['SOCIOS', 'QSA'] },
    ];

    if (selectedCompanies.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>Nenhuma empresa selecionada para comparação.</p>
                <button onClick={onClose} className="mt-4 text-[#dbaa3d] font-bold">Voltar para Tabela</button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#FAFAFA]">
                <h2 className="text-lg font-bold text-[#222222] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#dbaa3d]" />
                    Comparador de Empresas ({selectedCompanies.length})
                </h2>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 border-separate border-spacing-0">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 min-w-[200px] border-b border-gray-200 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Atributo
                            </th>
                            {selectedCompanies.map((company, idx) => (
                                <th key={idx} className="px-6 py-4 text-left text-xs font-bold text-[#222222] uppercase tracking-wider bg-gray-50 border-b border-gray-200 min-w-[250px] relative group">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="line-clamp-2" title={getName(company)}>{getName(company)}</span>
                                        <button 
                                            onClick={() => onRemove(company)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-red-500 transition-all"
                                            title="Remover da comparação"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {comparisonRows.map((rowConfig, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {rowConfig.label}
                                </td>
                                {selectedCompanies.map((company, companyIdx) => (
                                    <td key={companyIdx} className="px-6 py-3 text-sm text-gray-700 whitespace-normal min-w-[250px] max-w-[300px]">
                                        <div className="max-h-[100px] overflow-y-auto custom-scrollbar">
                                            {findValue(company, rowConfig.keywords, rowConfig.type)}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};