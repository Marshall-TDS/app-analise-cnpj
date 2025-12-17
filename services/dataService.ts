import Papa from 'papaparse';
import { DataRow, ColumnMeta } from '../types';
import { CNAE_LIST } from '../constants';

// Main Sheet ID
const SHEET_ID = '1EpXltXf1lIRTD604cvnkJwfVHWoPu9dWqSEfp2nr5A4';

// IDs das abas (GIDs) fornecidos
const SHEET_GIDS = ['1578193024', '287609093', '1298660928']; 

// Utilizando a API de Visualização do Google (GVIZ) pois ela lida melhor com CORS e downloads via fetch
const fetchUrl = (gid: string) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;

// Formatters
const formatCNPJ = (value: string) => {
  if (!value) return value;
  const v = value.replace(/\D/g, '').padStart(14, '0');
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {timeZone: 'UTC'}).format(date);
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const fetchSheetData = async (): Promise<DataRow[]> => {
  try {
    const allData: DataRow[] = [];

    for (const gid of SHEET_GIDS) {
      try {
        const response = await fetch(fetchUrl(gid));
        
        if (!response.ok) {
            console.warn(`Falha na requisição para aba ID ${gid}: ${response.status}`);
            continue;
        }
        
        const csvText = await response.text();
        
        // Verificação de segurança: Se a planilha não for pública, o Google retorna HTML de login
        if (csvText.trim().toLowerCase().startsWith('<!doctype html') || csvText.includes('<html')) {
             console.error(`Aba ID ${gid} retornou HTML (provavelmente tela de login). Verifique se a planilha está pública ("Qualquer pessoa com o link").`);
             continue;
        }

        const result = await new Promise<DataRow[]>((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: 'greedy',
            complete: (results) => {
              if (results.errors.length > 0) {
                  console.warn("Avisos de parse CSV:", results.errors);
              }
              
              const cleanedData = (results.data as DataRow[]).map(row => {
                const keys = Object.keys(row);
                
                const newRow: DataRow = {};
                
                keys.forEach(key => {
                  let val = row[key];
                  const upperKey = key.toUpperCase();

                  // --- Regras de Formatação ---

                  // 1. CNPJ
                  if (upperKey.includes('CNPJ') && val) {
                     val = formatCNPJ(String(val));
                  }

                  // 2. Data
                  if ((upperKey.includes('DATA') || upperKey.includes('INICIO')) && val) {
                     val = formatDate(String(val));
                     // Extract Year for trends
                     const dateObj = new Date(String(row[key]));
                     if (!isNaN(dateObj.getTime())) {
                        newRow['_year'] = dateObj.getFullYear();
                     }
                  }

                  // 3. Capital Social (Money)
                  if (upperKey.includes('CAPITAL') && val !== null && val !== undefined) {
                      if (typeof val === 'string') {
                           // Limpa R$, pontos e ajusta vírgula decimal
                           const cleanStr = val.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
                           val = parseFloat(cleanStr);
                      }
                      
                      newRow['_raw_capital'] = typeof val === 'number' ? val : 0; 
                      
                      if (typeof val === 'number') {
                          val = formatCurrency(val);
                      }
                  }

                  // 4. Sócios (List)
                  if (upperKey.includes('SOCIOS') || upperKey.includes('QSA')) {
                      if (typeof val === 'string') {
                          const socios = val.split(';').map(s => s.trim()).filter(s => s);
                          newRow['_socios_list'] = socios;
                          newRow['_socios_count'] = socios.length;
                          val = socios.join('; '); 
                      } else {
                          newRow['_socios_list'] = [];
                          newRow['_socios_count'] = 0;
                      }
                  }

                  // 5. CNAEs / Atividades
                  // CNAE Principal - Pega "CNAE Primario" ou "Principal"
                  if ((upperKey.includes('CNAE') || upperKey.includes('ATIVIDADE')) && (upperKey.includes('PRIMARIO') || upperKey.includes('PRIMÁRIO') || upperKey.includes('PRINCIPAL'))) {
                      newRow['_cnae_principal'] = val;
                  }

                  // CNAE Secundário - Pega "CNAES Secundarios" e faz split por ";"
                  if ((upperKey.includes('CNAE') || upperKey.includes('ATIVIDADE')) && (upperKey.includes('SECUNDARI') || upperKey.includes('SECUNDÁRI'))) {
                      if (typeof val === 'string') {
                          // Split por ";" conforme solicitado
                          const cnaes = val.split(';').map(s => s.trim()).filter(s => s.length > 0);
                          newRow['_cnae_sec_list'] = cnaes;
                          newRow['_cnae_sec_count'] = cnaes.length;
                      } else {
                          newRow['_cnae_sec_list'] = [];
                          newRow['_cnae_sec_count'] = 0;
                      }
                  }
                  
                  // 6. UF extraction (Logic to find state)
                  if (upperKey === 'UF' || upperKey.includes('ESTADO')) {
                      newRow['_uf'] = String(val).toUpperCase().trim();
                  }

                  newRow[key] = val;
                });

                return newRow;
              });
              resolve(cleanedData);
            },
            error: (error: Error) => reject(error)
          });
        });
        
        allData.push(...result);
      } catch (err) {
          console.error(`Erro ao processar aba ${gid}:`, err);
      }
    }

    if (allData.length === 0) {
        throw new Error("Nenhum dado encontrado. Verifique se a planilha está pública e acessível.");
    }

    return allData;

  } catch (error) {
    console.error("Erro geral no serviço de dados:", error);
    throw error;
  }
};

export const analyzeColumns = (data: DataRow[]): ColumnMeta[] => {
  if (data.length === 0) return [];
  
  const sample = data[0];
  const keys = Object.keys(sample).filter(k => !k.startsWith('_')); 
  
  return keys.map(key => {
    let type: ColumnMeta['type'] = 'string';
    const upperKey = key.toUpperCase();

    if (upperKey.includes('CAPITAL')) type = 'currency';
    else if (upperKey.includes('DATA') || upperKey.includes('INICIO')) type = 'date';
    else if (upperKey.includes('SOCIOS')) type = 'list';
    
    if (type === 'string') {
        const firstNonNull = data.find(row => row[key] !== null && row[key] !== undefined && row[key] !== '');
        if (firstNonNull) {
            const val = firstNonNull[key];
            if (typeof val === 'number') type = 'number';
            else if (typeof val === 'boolean') type = 'boolean';
        }
    }

    return {
      accessorKey: key,
      header: key,
      type,
      uniqueValues: 0
    };
  });
};

export const getTopCapital = (data: DataRow[]): { name: string, value: number, fullData: DataRow }[] => {
    return [...data]
        .sort((a, b) => (b['_raw_capital'] || 0) - (a['_raw_capital'] || 0))
        .slice(0, 10)
        .map(row => {
            const nameKey = Object.keys(row).find(k => 
                !k.startsWith('_') && (k.toUpperCase().includes('RAZAO') || k.toUpperCase().includes('NOME'))
            ) || Object.keys(row)[0];

            return {
                name: String(row[nameKey] || 'Sem Nome').substring(0, 20) + '...', 
                value: row['_raw_capital'] || 0,
                fullData: row
            };
        });
};

export const getTopCNAESecundary = (data: DataRow[]): { name: string, value: number, fullData: DataRow }[] => {
    // Create a Set of cleaned financial CNAE codes for fast lookup
    const financialCNAESet = new Set(CNAE_LIST.map(c => c.code.replace(/\D/g, '')));

    return [...data]
        .map(row => {
            const secList = (row['_cnae_sec_list'] || []) as string[];
            // Count only secondary CNAEs that exist in our Financial Services list
            const financialCount = secList.reduce((acc, cnaeCode) => {
                const cleanCode = cnaeCode.replace(/\D/g, '');
                return financialCNAESet.has(cleanCode) ? acc + 1 : acc;
            }, 0);
            
            return {
                ...row,
                _financial_count: financialCount
            };
        })
        .sort((a, b) => b._financial_count - a._financial_count)
        .slice(0, 10)
        .map(row => {
             const nameKey = Object.keys(row).find(k => 
                !k.startsWith('_') && (k.toUpperCase().includes('RAZAO') || k.toUpperCase().includes('NOME'))
            ) || Object.keys(row)[0];

             return {
                name: String(row[nameKey] || 'Sem Nome').substring(0, 20) + '...',
                value: row._financial_count, // Use the calculated financial count
                fullData: row
             };
        });
};

export const getCapitalTrend = (data: DataRow[]): { name: string, value: number }[] => {
    const trendMap: Record<string, number> = {};
    
    data.forEach(row => {
        if (row['_year'] && row['_raw_capital']) {
            const year = row['_year'];
            if (year > 1900 && year <= new Date().getFullYear()) {
                trendMap[year] = (trendMap[year] || 0) + row['_raw_capital'];
            }
        }
    });

    return Object.entries(trendMap)
        .map(([year, val]) => ({ name: year, value: val }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
};

export const getGeoDistribution = (data: DataRow[]): { name: string, value: number }[] => {
    const geoMap: Record<string, number> = {};

    data.forEach(row => {
        // Try to find UF key if _uf wasn't populated during load (fallback)
        let uf = row['_uf'];
        if (!uf) {
             const ufKey = Object.keys(row).find(k => k.toUpperCase() === 'UF' || k.toUpperCase() === 'ESTADO');
             if (ufKey) uf = row[ufKey];
        }

        if (uf && typeof uf === 'string' && uf.length === 2) {
            geoMap[uf] = (geoMap[uf] || 0) + 1;
        }
    });

    return Object.entries(geoMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value) // Descending
        .slice(0, 27); // Limit to Brazilian states count
};