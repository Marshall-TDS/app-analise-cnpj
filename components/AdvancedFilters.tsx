import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Filter, ChevronDown, ChevronUp, CheckSquare, Square, Trash2, X, Search } from 'lucide-react';
import { DataRow } from '../types';
import { CNAE_LIST, NATUREZA_JURIDICA_LIST } from '../constants';

interface AdvancedFiltersProps {
    data: DataRow[];
    onFilterChange: (filters: { cnaes: string[], ufs: string[], naturezas: string[] }) => void;
    filteredCount: number;
}

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

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ data, onFilterChange, filteredCount }) => {
    const [selectedCnaes, setSelectedCnaes] = useState<string[]>([]);
    const [selectedUfs, setSelectedUfs] = useState<string[]>([]);
    const [selectedNaturezas, setSelectedNaturezas] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Prepare Options (Memoized)
    const options = useMemo(() => {
        // CNAE Options from Constant
        const cnaes = CNAE_LIST.map(c => ({ label: c.desc, value: c.code }));

        // UF Options from Data - derive from current filtered dataset
        const ufsSet = new Set<string>();
        
        // Also derive Naturezas from current dataset if we want them scoped too?
        // User asked for "considered as a filter applied", implying options should restrict.
        const naturezasSet = new Set<string>();

        data.forEach(row => {
            // UF
            let uf = row['_uf'];
            if (!uf) {
                 const ufKey = Object.keys(row).find(k => k.toUpperCase() === 'UF' || k.toUpperCase() === 'ESTADO');
                 if (ufKey) uf = row[ufKey];
            }
            if (uf && uf.length === 2) ufsSet.add(uf);

            // Natureza Check (optional enhancement)
            const natKey = Object.keys(row).find(k => k.toUpperCase().includes('NATUREZA') || k.toUpperCase().includes('JURIDICA'));
            if (natKey) {
                 const val = String(row[natKey]).toUpperCase();
                 // This is harder to map back to constant list perfectly, so we might keep constant list
                 // but checking existence is good.
            }
        });

        const ufs = Array.from(ufsSet).sort().map(uf => ({ label: uf, value: uf }));

        // Natureza Juridica Options from Constant (keep constant for now as user didn't explicitly ask to Scope naturezas, just "refletir em todo o app")
        const naturezas = NATUREZA_JURIDICA_LIST.map(n => ({ label: n, value: n }));

        return { cnaes, ufs, naturezas };
    }, [data]);

    // Notify parent on change
    useEffect(() => {
        onFilterChange({
            cnaes: selectedCnaes,
            ufs: selectedUfs,
            naturezas: selectedNaturezas
        });
    }, [selectedCnaes, selectedUfs, selectedNaturezas, onFilterChange]);

    const handleClearFilters = () => {
        setSelectedCnaes([]);
        setSelectedUfs([]);
        setSelectedNaturezas([]);
    };

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm relative z-40 mb-4 rounded-xl overflow-visible mx-4 md:mx-6 mt-4">
             <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl"
            >
                <div className="flex items-center gap-2 text-[#dbaa3d] font-bold">
                    <Filter className="w-5 h-5" />
                    <span>Filtros Avançados</span>
                     <div className="ml-2 text-xs text-gray-500 font-mono bg-white border border-gray-200 px-2 py-0.5 rounded">
                         <span className="hidden sm:inline">{filteredCount} registros filtrados</span>
                         <span className="sm:hidden">{filteredCount}</span>
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
    );
};
