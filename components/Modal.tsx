import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar, MapPin, DollarSign, Users, Activity, Briefcase, Star } from 'lucide-react';
import { DataRow } from '../types';
import { formatCurrency } from '../services/dataService';
import { CNAE_LIST } from '../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-[#222222] bg-opacity-90 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block align-bottom bg-[#FAFAFA] rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-[#dbaa3d]/20">
          <div className="bg-[#222222] px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-[#dbaa3d]">
            <div className="flex justify-between items-center">
              <h3 className="text-xl leading-6 font-bold text-[#dbaa3d]" id="modal-title">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="bg-black/50 rounded-full p-2 hover:bg-[#dbaa3d] hover:text-[#222222] text-white transition-colors focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="bg-[#FAFAFA] px-4 py-6 sm:p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CompanyDetailProps {
    company: DataRow;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, isFavorite = false, onToggleFavorite }) => {
    
    // Helper to find keys safely
    const getValue = (keyPart: string) => {
        const key = Object.keys(company).find(k => k.toUpperCase().includes(keyPart));
        return key ? company[key] : 'N/A';
    };

    const getSpecificValue = (parts: string[]) => {
         const key = Object.keys(company).find(k => {
             const upper = k.toUpperCase();
             return parts.every(part => upper.includes(part));
         });
         return key ? company[key] : null;
    }

    const formatCapital = (val: any) => {
        // If it's already a formatted string, return it, otherwise format raw number
        if (typeof val === 'number') return formatCurrency(val);
        // Sometimes it comes as string "R$ 1.000,00".
        if (typeof val === 'string' && (val.includes('R$') || val.includes('$'))) return val;
        
        // Fallback: try to find raw value in hidden field
        if (company['_raw_capital']) return formatCurrency(company['_raw_capital']);
        
        return val;
    };

    // Helper to find CNAE description
    const getCnaeDescription = (code: string) => {
        const cleanCode = code.replace(/\D/g, '');
        const found = CNAE_LIST.find(c => c.code.replace(/\D/g, '') === cleanCode);
        return found ? found.desc : null;
    };

    // Use processed fields from dataService
    const cnaePrincipal = company['_cnae_principal'] || getSpecificValue(['CNAE', 'PRINCIPAL']) || getSpecificValue(['CNAE', 'PRIMARIO']) || 'Não informado';
    
    // Get list and count
    const secondaryList = (company['_cnae_sec_list'] || []) as string[];
    const secondaryCount = company['_cnae_sec_count'] || 0;

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-end">
                {onToggleFavorite && (
                    <button 
                        onClick={onToggleFavorite}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${isFavorite ? 'bg-[#dbaa3d]/10 text-[#dbaa3d] border-[#dbaa3d]' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'}`}
                    >
                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-[#dbaa3d]' : ''}`} />
                        {isFavorite ? 'Favorita' : 'Favoritar Empresa'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#222222]">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#dbaa3d]" /> Identificação
                    </h4>
                    <div className="space-y-3">
                        <div>
                            <span className="text-xs text-gray-500 block">Razão Social</span>
                            <span className="text-sm font-bold text-[#222222]">{getValue('RAZAO') || getValue('NOME')}</span>
                        </div>
                         <div>
                            <span className="text-xs text-gray-500 block">CNPJ</span>
                            <span className="text-sm font-mono text-gray-700">{getValue('CNPJ')}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Nome Fantasia</span>
                            <span className="text-sm text-gray-700">{getValue('FANTASIA') || '-'}</span>
                        </div>
                         <div>
                            <span className="text-xs text-gray-500 block">Localização</span>
                            <span className="text-sm text-gray-700">{getValue('MUNICIPIO') || getValue('CIDADE')} - {getValue('UF') || getValue('ESTADO')}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#dbaa3d]">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#dbaa3d]" /> Dados Financeiros
                    </h4>
                    <div className="space-y-3">
                         <div>
                            <span className="text-xs text-gray-500 block">Capital Social</span>
                            <span className="text-xl font-bold text-[#222222]">{formatCapital(getValue('CAPITAL'))}</span>
                        </div>
                         <div>
                            <span className="text-xs text-gray-500 block">Porte</span>
                            <span className="text-sm text-gray-700">{getValue('PORTE') || '-'}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Data Abertura</span>
                            <span className="text-sm text-gray-700">{getValue('DATA') || getValue('ABERTURA')}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#dbaa3d]" /> Quadro Societário ({company['_socios_count']})
                    </h4>
                    {company['_socios_list'] && company['_socios_list'].length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {company['_socios_list'].map((socio: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#222222] text-[#dbaa3d]">
                                    {socio}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 italic">Nenhum sócio listado.</p>
                    )}
                </div>

                 <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm md:col-span-2">
                     <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#dbaa3d]" /> Atividades Econômicas
                    </h4>
                    <div className="space-y-6">
                        {/* CNAE Principal */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-[#dbaa3d] text-[#222222] text-[10px] font-bold px-2 py-0.5 rounded uppercase">Principal</span>
                            </div>
                            <div className="bg-[#FAFAFA] border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                                <Briefcase className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-bold text-[#222222]">{cnaePrincipal}</p>
                                    {getCnaeDescription(cnaePrincipal) && (
                                        <p className="text-xs text-gray-500 mt-1">{getCnaeDescription(cnaePrincipal)}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CNAEs Secundarios */}
                        <div>
                             <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                                 <span className="text-xs font-semibold text-gray-500 uppercase">Secundários</span>
                                 <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{secondaryCount}</span>
                             </div>
                             
                             {secondaryList.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {secondaryList.map((cnae: string, i: number) => {
                                        const desc = getCnaeDescription(cnae);
                                        return (
                                            <div key={i} className="flex flex-col p-3 rounded-lg border border-gray-200 bg-white hover:border-[#dbaa3d]/50 transition-colors">
                                                <span className="text-xs font-mono font-bold text-[#222222] bg-gray-50 px-1.5 py-0.5 rounded w-fit mb-1.5">
                                                    {cnae}
                                                </span>
                                                {desc ? (
                                                    <span className="text-xs text-gray-600 leading-tight line-clamp-2" title={desc}>
                                                        {desc}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic">Descrição não disponível</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                             ) : (
                                <p className="text-sm text-gray-400 italic">Nenhuma atividade secundária informada.</p>
                             )}
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};