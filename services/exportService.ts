import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas'; 
import { DataRow } from '../types';
import { formatCurrency } from './dataService';

// Helper to find value by lenient keys
const findValue = (row: DataRow, possibleKeys: string[]): any => {
    const keys = Object.keys(row);
    for (const pk of possibleKeys) {
        if (row[pk] !== undefined) return row[pk];
    }
    for (const pk of possibleKeys) {
        const foundKey = keys.find(k => k.toUpperCase().includes(pk.toUpperCase()));
        if (foundKey) return row[foundKey];
    }
    return null;
};

// Helper for Name
const getName = (row: DataRow) => {
    return findValue(row, ['RAZAO', 'NOME']) || 'Empresa Sem Nome';
};

// Helper for CNPJ
const getCNPJ = (row: DataRow) => {
    return findValue(row, ['CNPJ']) || '';
};

export const exportToPDF = async (
    data: DataRow[], 
    isFavoritesMode: boolean, 
    elementIdsToCapture: string[] = ['chart-capital', 'chart-services', 'chart-financial', 'chart-map', 'chart-trend']
) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFillColor(34, 34, 34); // #222222
    doc.rect(0, 0, width, 25, 'F');
    doc.setTextColor(219, 170, 61); // #dbaa3d
    doc.setFontSize(18);
    doc.text('Relatório de Empresas - Marshall TDS', 10, 15);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} - ${data.length} empresas`, 10, 22);

    let currentY = 35;

    // --- Content ---
    if (isFavoritesMode) {
        // CARD LAYOUT (1 per page)
        for (let i = 0; i < data.length; i++) {
            if (i > 0) {
                doc.addPage();
                doc.setFillColor(34, 34, 34);
                doc.rect(0, 0, width, 15, 'F'); 
                currentY = 25;
            }

            const row = data[i];
            
            // --- Layout Calculations ---
            const pageHeight = doc.internal.pageSize.getHeight();
            const cardHeight = pageHeight - 40; // 20mm margin top, 20mm margin bottom approx
            
            // Name: Wrap text instead of truncate
            const rawName = String(getName(row));
            // Max width: Page width (210mm) - Margins (20mm) - Padding (20mm) = ~170mm
            // Constrain it to 170mm max to be safe
            const nameWidth = Math.min(width - 40, 170); 
            const splitName = doc.splitTextToSize(rawName, nameWidth);
            const nameHeight = splitName.length * 7; // Approx height per line

            const cnpj = String(getCNPJ(row));
            const capital = row['_raw_capital'] || findValue(row, ['CAPITAL']) || 0;
            const uf = row['_uf'] || findValue(row, ['UF', 'ESTADO']);
            const cnaeP = row['_cnae_principal_desc'] || row['_cnae_principal'] || findValue(row, ['PRINCIPAL']) || '-';
            const natureza = findValue(row, ['NATUREZA', 'JURIDICA']) || '-';
            const sociosRaw = row['_socios_list'] || findValue(row, ['SOCIOS', 'QSA']) || [];
            const cnaesSecRaw = row['_cnae_sec_list'] || findValue(row, ['SECUNDARI', 'SECUNDÁRI']) || [];
            
            const telefone1 = findValue(row, ['TELEFONE 1', 'TEL 1', 'CELULAR', 'CONTATO 1']) || findValue(row, ['TELEFONE']) || '-';
            const telefone2 = findValue(row, ['TELEFONE 2', 'TEL 2', 'CONTATO 2']) || '-';
            const email = findValue(row, ['EMAIL', 'E-MAIL', 'CORREIO']) || '-';
            
            const capitalFormatted = typeof capital === 'number' ? formatCurrency(capital) : String(capital);

            // Card Container (Full Page)
            doc.setDrawColor(200, 200, 200);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(10, currentY, width - 20, cardHeight, 3, 3, 'FD');
            
            // --- Header (Name - Wrapped) ---
            doc.setTextColor(34, 34, 34);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(splitName, 15, currentY + 12);
            
            let headerBottomY = currentY + 12 + nameHeight;

            // --- Sub-Header (CNPJ + UF Badge) ---
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            
            const cnpjText = `CNPJ: ${cnpj}`;
            doc.text(cnpjText, 15, headerBottomY);
            
            // Draw UF Badge next to CNPJ
            if(uf) {
                 const cnpjWidth = doc.getTextWidth(cnpjText);
                 const badgeX = 15 + cnpjWidth + 5;
                 
                 doc.setFillColor(34, 34, 34); // Dark bg
                 doc.roundedRect(badgeX, headerBottomY - 4, 12, 5, 1, 1, 'F');
                 
                 doc.setTextColor(219, 170, 61); // Gold text
                 doc.setFontSize(8);
                 doc.setFont('helvetica', 'bold');
                 doc.text(String(uf), badgeX + 1.5, headerBottomY - 0.5);
            }
            
            headerBottomY += 10; // Extra spacing after header

            // --- Details Fields ---
            let detailY = headerBottomY;
            
            const addField = (label: string, value: string) => {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(128, 128, 128);
                doc.text(label.toUpperCase(), 15, detailY);
                doc.setFontSize(11);
                doc.setTextColor(34, 34, 34);
                // Wrap value if needed
                const splitValue = doc.splitTextToSize(String(value), width - 40);
                doc.text(splitValue, 15, detailY + 5);
                detailY += (splitValue.length * 5) + 8;
            };

            addField('Capital Social', capitalFormatted);
            addField('Natureza Jurídica', String(natureza));
            addField('Atividade Principal', String(cnaeP));
            
            // Contact Info line (Compact)
            if (telefone1 !== '-' || email !== '-') {
                 doc.setFontSize(8);
                 doc.setFont('helvetica', 'normal');
                 doc.setTextColor(128, 128, 128);
                 doc.text("CONTATO", 15, detailY);
                 detailY += 4;
                 
                 doc.setFontSize(9);
                 doc.setTextColor(34, 34, 34);
                 let contactText = '';
                 if (telefone1 !== '-') contactText += `Tel: ${telefone1}  `;
                 if (telefone2 !== '-') contactText += `/  ${telefone2}  `;
                 if (email !== '-') contactText += `|  Email: ${email}`;
                 
                 const splitContact = doc.splitTextToSize(contactText, width - 40);
                 doc.text(splitContact, 15, detailY);
                 detailY += (splitContact.length * 5) + 8;
            }
            detailY += 2; 

            // --- Helper to Draw Badges Grid ---
            const drawBadges = (title: string, items: string[], maxLines: number = 20) => {
                if (!items || items.length === 0) return;
                
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(128, 128, 128);
                doc.text(title, 15, detailY);
                detailY += 4; // Space after title

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                
                let startX = 15;
                let currentLine = 0;
                const maxWidth = width - 25; // Right margin

                for (let j = 0; j < items.length; j++) {
                    const item = String(items[j]).trim();
                    if(!item) continue;
                    
                    const itemWidth = doc.getTextWidth(item) + 6; // padding
                    
                    // Check wrap
                    if (startX + itemWidth > maxWidth) {
                        startX = 15;
                        detailY += 7; // Line height
                        currentLine++;
                    }
                    
                    if (currentLine >= maxLines) {
                        doc.text("...", startX, detailY + 3);
                        break;
                    }

                    // Badge BG
                    doc.setFillColor(240, 240, 240);
                    doc.setDrawColor(220, 220, 220);
                    doc.roundedRect(startX, detailY, itemWidth, 5, 1, 1, 'FD');
                    
                    // Text
                    doc.setTextColor(50, 50, 50);
                    doc.text(item, startX + 3, detailY + 3.5);
                    
                    startX += itemWidth + 2; // Gap
                }
                detailY += 10; // Margin after section
            };

            // Parse lists safely
            const secList = Array.isArray(cnaesSecRaw) ? cnaesSecRaw : String(cnaesSecRaw).split(';').map(s => s.trim()).filter(s=>s);
            drawBadges("ATIVIDADES SECUNDÁRIAS", secList);

            const sociosList = Array.isArray(sociosRaw) ? sociosRaw.map(s => s.nome || s) : String(sociosRaw).split(';').map(s => s.trim()).filter(s=>s);
            drawBadges("SÓCIOS", sociosList);

            currentY = 35; // Reset logic for next loop
        }

    } else {
        // TABLE LAYOUT
        const tableBody = data.map(row => [
            String(getName(row)).substring(0, 30),
            String(getCNPJ(row)),
            String(row['_uf'] || findValue(row, ['UF', 'ESTADO']) || ''),
            formatCurrency(Number(row['_raw_capital'] || findValue(row, ['CAPITAL']) || 0)),
            String(row['_cnae_principal_desc'] || row['_cnae_principal'] || findValue(row, ['PRINCIPAL']) || '').substring(0, 40)
        ]);

        autoTable(doc, {
            head: [['Razão Social', 'CNPJ', 'UF', 'Capital', 'Atividade Principal']],
            body: tableBody,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [34, 34, 34], textColor: [219, 170, 61] },
            styles: { fontSize: 8 },
        });
    }

    // --- Charts ---
    try {
        doc.addPage();
        doc.setFillColor(34, 34, 34);
        doc.rect(0, 0, width, 15, 'F');
        doc.setTextColor(219, 170, 61);
        doc.setFontSize(14);
        doc.text("Análise Gráfica", 10, 10);
        
        let chartY = 30;
        
        for (const id of elementIdsToCapture) {
            const element = document.getElementById(id);
            if (element) {
                const canvas = await html2canvas(element, { 
                    scale: 2, 
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true
                });
                const imgData = canvas.toDataURL('image/png');
                
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth() - 20;
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                if (chartY + pdfHeight > doc.internal.pageSize.getHeight() - 10) {
                    doc.addPage();
                    chartY = 20;
                }

                doc.addImage(imgData, 'PNG', 10, chartY, pdfWidth, pdfHeight);
                chartY += pdfHeight + 10;
            }
        }

    } catch (e) {
        console.error("Error generating charts in PDF", e);
    }

    doc.save('relatorio_marshall.pdf');
};
