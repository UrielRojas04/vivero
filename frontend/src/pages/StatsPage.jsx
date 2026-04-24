import React from 'react';
import { FileDown, Table as TableIcon, BarChart3 } from 'lucide-react';
import { EstadisticasView } from '../components/stats/EstadisticasView';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Importación corregida
import * as XLSX from 'xlsx';

export const StatsPage = ({ bandejas, variedades }) => {

  const exportarExcel = () => {
    const dataInventario = bandejas.filter(b => !b.vendida).map(b => ({
      Lote: b.codigoLote,
      Variedad: b.variedad.nombre,
      Duenio: b.duenio || 'S/D',
      Cantidad: b.cantidad,
      Ubicacion: b.ubicacion?.nombre || 'Semillero',
      Siembra: b.fechaSiembra,
      Salida_Est: b.fechaEstimadaSalida
    }));

    const ws = XLSX.utils.json_to_sheet(dataInventario);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario Actual");
    XLSX.writeFile(wb, `Inventario_Vivero_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // Verde Esmeralda ViveroPro
    doc.text("ViveroPro - Inventario de Control", 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

    const tableColumn = ["Lote", "Variedad", "Cant.", "Ubicación", "Dueño"];
    const tableRows = bandejas.filter(b => !b.vendida).map(b => [
      b.codigoLote,
      b.variedad.nombre,
      b.cantidad,
      b.ubicacion?.nombre || 'Semillero',
      b.duenio || 'S/D'
    ]);

    // Llamada corregida a autoTable
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`Inventario_Vivero_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="px-2 flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-2xl text-white shadow-lg">
            <BarChart3 size={20} />
          </div>
          Estadísticas
        </h2>
      </header>

      <div className="flex gap-3 px-1">
        <button
          onClick={exportarPDF}
          className="flex-1 bg-white border border-slate-200 p-4 rounded-3xl flex items-center justify-center gap-3 font-black text-[10px] uppercase text-slate-600 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
        >
          <FileDown size={18} className="text-red-500"/> PDF de Control
        </button>
        <button
          onClick={exportarExcel}
          className="flex-1 bg-white border border-slate-200 p-4 rounded-3xl flex items-center justify-center gap-3 font-black text-[10px] uppercase text-slate-600 shadow-sm active:scale-95 transition-all hover:bg-slate-50"
        >
          <TableIcon size={18} className="text-emerald-600"/> Excel Completo
        </button>
      </div>

      <EstadisticasView bandejas={bandejas} variedades={variedades} />
    </div>
  );
};