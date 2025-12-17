import React, { useEffect, useState, useMemo } from 'react';
import { DataTable } from './components/DataTable';
import { Charts } from './components/Charts';
import { ComparisonView } from './components/ComparisonView';
import { Modal, CompanyDetail } from './components/Modal';
import { fetchSheetData, analyzeColumns } from './services/dataService';
import { DataRow, ColumnMeta, ViewMode } from './types';
import { Table, Loader2, AlertCircle, PieChart, BadgeDollarSign, Scale, Star, List, ImageOff } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.TABLE);
  
  // Favorites State (Global)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Selection & Modal
  const [selectedCompany, setSelectedCompany] = useState<DataRow | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<DataRow[]>([]);
  
  // Statistics
  const [totalRecords, setTotalRecords] = useState(0);

  // 1. Hash Navigation Logic
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').toUpperCase();
      if (Object.values(ViewMode).includes(hash as ViewMode)) {
        setViewMode(hash as ViewMode);
      } else {
        // Default to TABLE if no hash or invalid
        if (!hash && viewMode === ViewMode.TABLE) return;
        setViewMode(ViewMode.TABLE);
      }
    };

    // Initial check
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when mode changes
  const handleModeChange = (mode: ViewMode) => {
    window.location.hash = `/${mode.toLowerCase()}`;
    setViewMode(mode);
  };

  // 2. Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const rawData = await fetchSheetData();
        setData(rawData);
        setTotalRecords(rawData.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 3. Load Favorites
  useEffect(() => {
    const stored = localStorage.getItem('company_favorites');
    if (stored) {
        try {
            setFavoriteIds(new Set(JSON.parse(stored)));
        } catch (e) {
            console.error("Failed to load favorites", e);
        }
    }
  }, []);

  // Helper: Get ID from row
  const getRowId = (row: DataRow) => {
    const cnpjKey = Object.keys(row).find(k => k.toUpperCase().includes('CNPJ'));
    return cnpjKey ? row[cnpjKey] : JSON.stringify(row);
  };

  const handleToggleFavorite = (row: DataRow) => {
    const id = getRowId(row);
    const newFavs = new Set(favoriteIds);
    if (newFavs.has(id)) {
        newFavs.delete(id);
    } else {
        newFavs.add(id);
    }
    setFavoriteIds(newFavs);
    localStorage.setItem('company_favorites', JSON.stringify(Array.from(newFavs)));
  };

  // 4. Filter Data based on Favorites
  const displayedData = useMemo(() => {
    if (!showFavoritesOnly) return data;
    return data.filter(row => favoriteIds.has(getRowId(row)));
  }, [data, showFavoritesOnly, favoriteIds]);

  const columnsMeta = useMemo<ColumnMeta[]>(() => {
    return analyzeColumns(data);
  }, [data]);

  const handleChartClick = (rows: DataRow[], title: string) => {
      if (rows.length === 1) {
          setSelectedCompany(rows[0]);
      } 
  };
  
  const handleComparison = () => {
      if (selectedForComparison.length > 0) {
          handleModeChange(ViewMode.COMPARISON);
      }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-[#dbaa3d] animate-spin" />
        <h2 className="text-xl font-semibold text-[#222222]">Carregando Dados...</h2>
        <p className="text-slate-500">Buscando e processando registros financeiro.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center border-l-4 border-red-500">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#222222] mb-2">Erro ao Carregar</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#222222] hover:bg-black text-[#dbaa3d] font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans">
      
      {/* Navbar */}
      <header className="bg-[#222222] text-white shadow-lg z-20">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
                {!logoError ? (
                  <img 
                      src="https://marshalltds.com/images/marshall-logo-gold.png"
                      alt="Marshall Logo" 
                      className="h-10 w-auto object-contain"
                      onError={() => setLogoError(true)} 
                  />
                ) : (
                  <div className="flex items-center gap-2 text-[#dbaa3d]">
                    <BadgeDollarSign className="w-8 h-8" />
                  </div>
                )}
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#dbaa3d] hidden sm:block">
                  Empresas de Serviços Financeiros
                </h1>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
                <div className="hidden md:flex items-center space-x-2 bg-black/30 px-3 py-1.5 rounded-full border border-[#dbaa3d]/30">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-medium text-[#FAFAFA]">Online</span>
                </div>
                <div className="px-3 py-1 border-l border-[#dbaa3d]/30 pl-4">
                    <span className="font-bold text-[#dbaa3d] text-lg">{displayedData.length.toLocaleString('pt-BR')}</span> <span className="text-xs uppercase tracking-wide opacity-70">Registros</span>
                </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Toolbar - Optimized for Mobile Single Line */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm z-10">
            <div className="w-full max-w-[1600px] mx-auto flex flex-row justify-between items-center gap-2">
                
                <div className="flex-1 overflow-x-auto no-scrollbar">
                  <div className="flex space-x-1 bg-[#FAFAFA] p-1 rounded-lg border border-gray-200 w-fit">
                      <button 
                          onClick={() => handleModeChange(ViewMode.TABLE)}
                          className={`flex items-center px-3 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                              viewMode === ViewMode.TABLE 
                              ? 'bg-[#222222] text-[#dbaa3d] shadow-sm' 
                              : 'text-gray-500 hover:text-[#222222] hover:bg-gray-200/50'
                          }`}
                      >
                          <Table className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Tabela</span>
                      </button>
                      <button 
                          onClick={() => handleModeChange(ViewMode.LIST)}
                          className={`flex items-center px-3 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                              viewMode === ViewMode.LIST 
                              ? 'bg-[#222222] text-[#dbaa3d] shadow-sm' 
                              : 'text-gray-500 hover:text-[#222222] hover:bg-gray-200/50'
                          }`}
                      >
                          <List className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Lista</span>
                      </button>
                      <button 
                          onClick={() => handleModeChange(ViewMode.CHARTS)}
                          className={`flex items-center px-3 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                              viewMode === ViewMode.CHARTS 
                              ? 'bg-[#222222] text-[#dbaa3d] shadow-sm' 
                              : 'text-gray-500 hover:text-[#222222] hover:bg-gray-200/50'
                          }`}
                      >
                          <PieChart className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Gráficos</span>
                      </button>
                      
                      {selectedForComparison.length > 0 && (
                          <button 
                              onClick={handleComparison}
                              className={`flex items-center px-3 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ml-2 animate-in fade-in zoom-in ${
                                  viewMode === ViewMode.COMPARISON 
                                  ? 'bg-[#222222] text-[#dbaa3d] shadow-sm' 
                                  : 'bg-[#dbaa3d] text-[#222222] hover:bg-[#c99b32] shadow-sm'
                              }`}
                          >
                              <Scale className="w-4 h-4 md:mr-2" />
                              <span className="hidden md:inline">Comparar ({selectedForComparison.length})</span>
                              <span className="md:hidden">({selectedForComparison.length})</span>
                          </button>
                      )}
                  </div>
                </div>
                
                {/* Favorites Toggle - Right aligned on mobile */}
                <div className="flex items-center flex-shrink-0">
                    <button
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={`flex items-center px-3 md:px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                            showFavoritesOnly 
                            ? 'bg-[#dbaa3d] text-[#222222] border-[#dbaa3d]' 
                            : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Star className={`w-4 h-4 md:mr-2 ${showFavoritesOnly ? 'fill-[#222222]' : ''}`} />
                        <span className="hidden md:inline">{showFavoritesOnly ? 'Vendo Favoritos' : 'Ver Favoritos'}</span>
                        {favoriteIds.size > 0 && (
                            <span className={`ml-1 md:ml-2 text-xs py-0.5 px-1.5 rounded-full ${showFavoritesOnly ? 'bg-[#222222] text-[#dbaa3d]' : 'bg-gray-200 text-gray-600'}`}>
                                {favoriteIds.size}
                            </span>
                        )}
                    </button>
                </div>

            </div>
        </div>

        {/* View Content */}
        <div className="flex-1 p-4 md:p-6 overflow-hidden relative">
            <div className="h-full w-full max-w-[1600px] mx-auto">
                {(viewMode === ViewMode.TABLE || viewMode === ViewMode.LIST) && (
                    <DataTable 
                        data={displayedData} 
                        columnsMeta={columnsMeta} 
                        onRowClick={(row) => setSelectedCompany(row)}
                        onSelectionChange={setSelectedForComparison}
                        viewMode={viewMode}
                        favorites={favoriteIds}
                        onToggleFavorite={handleToggleFavorite}
                        isFavoritesFilterActive={showFavoritesOnly}
                    />
                )}
                
                {viewMode === ViewMode.CHARTS && (
                    <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
                        <Charts 
                            data={displayedData} 
                            columnsMeta={columnsMeta} 
                            onBarClick={handleChartClick}
                        />
                    </div>
                )}

                {viewMode === ViewMode.COMPARISON && (
                    <ComparisonView 
                        selectedCompanies={selectedForComparison}
                        columnsMeta={columnsMeta}
                        onClose={() => handleModeChange(ViewMode.TABLE)}
                        onRemove={(company) => {
                            setSelectedForComparison(prev => prev.filter(c => c !== company));
                            if (selectedForComparison.length <= 1) handleModeChange(ViewMode.TABLE);
                        }}
                    />
                )}
            </div>
        </div>
      </main>

      {/* Modals */}
      <Modal 
        isOpen={!!selectedCompany} 
        onClose={() => setSelectedCompany(null)}
        title="Ficha da Empresa"
      >
        {selectedCompany && (
            <CompanyDetail 
                company={selectedCompany} 
                isFavorite={favoriteIds.has(getRowId(selectedCompany))}
                onToggleFavorite={() => handleToggleFavorite(selectedCompany)}
            />
        )}
      </Modal>

    </div>
  );
};

export default App;