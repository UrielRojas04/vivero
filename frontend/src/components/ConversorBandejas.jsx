import React, { useState } from 'react';
import { ArrowLeftRight, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import FormattedNumberInput from './FormattedNumberInput';

export default function ConversorBandejas() {
  const [modo, setModo] = useState('bandejas'); // 'bandejas' (input) a 'semillas' (output) o viceversa
  const [cantidad, setCantidad] = useState('');
  const [tipoBandejaId, setTipoBandejaId] = useState('');

  const { data: bandejas = [] } = useQuery({
    queryKey: ['variedades-bandejas'],
    queryFn: async () => {
      const res = await variedadesBandejasApi.getAll();
      return res.data;
    }
  });

  const bandejaSeleccionada = bandejas.find(b => b.id.toString() === tipoBandejaId);
  const celdas = bandejaSeleccionada?.cantidadCeldas || 0;

  // Cálculo
  let resultado = '';
  if (cantidad && celdas > 0) {
    const num = parseFloat(cantidad);
    if (!isNaN(num)) {
      if (modo === 'bandejas') {
        // Ingresó bandejas, calcular semillas
        resultado = `${Math.round(num * celdas).toLocaleString('es-AR')}`;
      } else {
        // Ingresó semillas, calcular bandejas
        const bandejasCalc = Math.floor(num / celdas);
        const semillasSobrantes = Math.round(num % celdas);
        
        resultado = `${bandejasCalc.toLocaleString('es-AR')}`;
        if (semillasSobrantes > 0) {
          resultado += ` (+${semillasSobrantes.toLocaleString('es-AR')} sem.)`;
        }
      }
    }
  }

  return (
    <div className="bg-paper rounded-panel border border-line p-4 min-w-[24rem] w-full max-w-[90vw]">
      <div className="flex items-center gap-2 mb-4 text-accent-ink">
        <Calculator className="w-5 h-5" />
        <h3 className="font-semibold">Conversor Rápido</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">
            Tipo de Bandeja
          </label>
          <select
            value={tipoBandejaId}
            onChange={(e) => setTipoBandejaId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors bg-paper"
          >
            <option value="">Seleccionar...</option>
            {bandejas.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre} ({b.cantidadCeldas} celdas)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-[1.5] min-w-0">
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">
              {modo === 'bandejas' ? 'Bandejas' : 'Semillas'}
            </label>
            <FormattedNumberInput
              value={cantidad}
              onChange={(val) => setCantidad(val)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent transition-colors font-mono tabular-nums"
            />
          </div>

          <button
            onClick={() => setModo(modo === 'bandejas' ? 'semillas' : 'bandejas')}
            className="mt-5 p-2 text-faint hover:text-accent-ink hover:bg-accent-soft rounded-base transition-colors cursor-pointer"
            title="Invertir conversión"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          <div className="flex-auto min-w-0">
            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1">
              {modo === 'bandejas' ? 'Semillas' : 'Bandejas'}
            </label>
            <div className="w-full px-3 py-2 text-sm border border-line bg-canvas rounded-base text-ink font-medium font-mono tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
              {resultado || '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
