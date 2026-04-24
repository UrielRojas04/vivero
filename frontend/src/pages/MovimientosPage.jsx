import React, { useState, useEffect } from 'react';
import { History, Search, Loader2, FileDown, Table as TableIcon } from 'lucide-react';
import api from '../api/config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { MovimientoCard } from '../components/movimientos/MovimientoCard';
import { HistorialLoteModal } from '../components/modals/HistorialLoteModal';

export const MovimientosPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [loteSeleccionado, setLoteSeleccionado] = useState(null);

  useEffect(() => {
    api.get('/bandejas/movimientos')
      .then(res => setMovimientos(res.data))
      .catch(e => console.error("Error al cargar movimientos:", e))
      .finally(() => setCargando(false));
  }, []);

  const getLabelTipo = (tipo) => {
    switch(tipo) {
      case 'REGISTRO': return 'NUEVA SIEMBRA';
      case 'UBICACION': return 'MOVIDO A INVERNADERO';
      case 'TRASLADO': return 'MOVIDO A TELAS';
      case 'VENTA': return 'VENTA FINALIZADA';
      case 'EDICION': return 'DATOS MODIFICADOS';
      case 'BORRADO': return 'LOTE ELIMINADO';
      default: return tipo;
    }
  };

  const movFiltrados = movimientos.filter(m =>
    m.codigoLote.toLowerCase().includes(filtro.toLowerCase()) ||
    (m.variedadNombre && m.variedadNombre.toLowerCase().includes(filtro.toLowerCase())) ||
    m.usuario.toLowerCase().includes(filtro.toLowerCase())
  );

  // --- EXPORTAR A EXCEL ---
  const exportarExcel = () => {
    const dataReporte = movFiltrados.map(m => ({
      Fecha: new Date(m.fecha).toLocaleString(),
      Tipo: getLabelTipo(m.tipo),
      Lote: m.codigoLote,
      Planta: m.variedadNombre,
      Cantidad: m.cantidad,
      Origen: m.origen,
      Destino: m.destino,
      Usuario: m.usuario
    }));

    const ws = XLSX.utils.json_to_sheet(dataReporte);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Log_Movimientos");
    XLSX.writeFile(wb, `Reporte_Movimientos_${new Date().getTime()}.xlsx`);
  };

  // --- EXPORTAR A PDF ---
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(124, 58, 237); // Color Púrpura Historial
    doc.text("ViveroPro - Log de Movimientos", 14, 15);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 22);

    const columns = ["Fecha", "Acción", "Lote", "Planta", "Cant.", "Usuario"];
    const rows = movFiltrados.map(m => [
      new Date(m.fecha).toLocaleDateString(),
      getLabelTipo(m.tipo),
      m.codigoLote,
      m.variedadNombre,
      m.cantidad,
      m.usuario
    ]);

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [124, 58, 237] },
      styles: { fontSize: 7 }
    });

    doc.save(`Historial_Movimientos_${new Date().getTime()}.pdf`);
  };

  if (cargando) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="px-2 flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-2xl text-white shadow-lg">
            <History size={20} />
          </div>
          Log de Movimientos
        </h2>
      </header>

      <div className="flex gap-3 px-1">
        <button onClick={exportarPDF} className="flex-1 bg-white border border-slate-100 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[9px] uppercase text-slate-500 shadow-sm active:scale-95 transition-all">
          <FileDown size={16} className="text-purple-600"/> Exportar PDF
        </button>
        <button onClick={exportarExcel} className="flex-1 bg-white border border-slate-100 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-[9px] uppercase text-slate-500 shadow-sm active:scale-95 transition-all">
          <TableIcon size={16} className="text-emerald-600"/> Exportar Excel
        </button>
      </div>

      <div className="relative mx-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text" placeholder="Buscar por planta, lote o usuario..."
          className="w-full pl-12 pr-4 py-4 rounded-[20px] bg-white shadow-sm border border-slate-100 outline-none focus:ring-2 focus:ring-purple-300 transition-all font-medium text-sm"
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="space-y-5 px-1">
        {movFiltrados.map((mov) => (
          <MovimientoCard key={mov.id} mov={mov} getLabelTipo={getLabelTipo} onOpenDetail={setLoteSeleccionado} />
        ))}
      </div>

      <HistorialLoteModal isOpen={!!loteSeleccionado} onClose={() => setLoteSeleccionado(null)} codigoLote={loteSeleccionado} />
    </div>
  );
};