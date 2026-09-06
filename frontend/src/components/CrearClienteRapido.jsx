import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';

/**
 * Panel de "creación rápida de cliente", reutilizable desde cualquier buscador de clientes cuyo
 * dropdown se quede sin coincidencias (change clientes-dni-cuil, Decisión 6 de design.md).
 * Generaliza el patrón `crearClienteRapido` ya usado en SiembraForm.jsx/RegistroSemillaForm.jsx,
 * sumando teléfono y un documento (DNI o CUIL) opcionales -- ninguno de los dos formularios
 * existentes se migra a este componente en este change (Decisión 6), sólo NuevaVenta.jsx lo usa.
 *
 * Props:
 * - nombre: texto ya tipeado en el buscador que originó este panel (se usa tal cual como
 *   nombreRazonSocial, no se vuelve a pedir).
 * - onCreado(cliente): callback invocado con el ClienteDTO recién creado, para que el buscador
 *   que lo originó lo deje seleccionado.
 * - mostrarCamposOpcionales: si es false, oculta teléfono y documento y sólo ofrece el botón de
 *   alta con el nombre (mismo comportamiento mínimo que SiembraForm/RegistroSemillaForm).
 */
export default function CrearClienteRapido({ nombre, onCreado, mostrarCamposOpcionales = true }) {
  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();

  const [telefono, setTelefono] = useState('');
  const [documentoTipo, setDocumentoTipo] = useState('');
  const [documentoValor, setDocumentoValor] = useState('');
  const [creando, setCreando] = useState(false);

  const nombreLimpio = (nombre || '').trim();

  const crearClienteRapido = async () => {
    if (!nombreLimpio || creando) return;
    setCreando(true);
    try {
      const payload = { nombreRazonSocial: nombreLimpio, telefono };
      if (documentoTipo === 'DNI') {
        payload.dni = documentoValor;
      } else if (documentoTipo === 'CUIL') {
        payload.cuil = documentoValor;
      }

      const nuevo = await clientesApi.create(payload);
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      pushToast('success', `Cliente "${nuevo.nombreRazonSocial}" creado.`);

      setTelefono('');
      setDocumentoTipo('');
      setDocumentoValor('');

      onCreado(nuevo);
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'No se pudo crear el cliente.'));
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      {mostrarCamposOpcionales && (
        <div className="px-4 py-2 border-t border-line space-y-2">
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="w-full px-2 py-1.5 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent outline-none bg-canvas"
          />
          <div className="flex gap-2">
            <select
              value={documentoTipo}
              onChange={(e) => {
                setDocumentoTipo(e.target.value);
                setDocumentoValor('');
              }}
              className="w-28 shrink-0 px-2 py-1.5 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent outline-none bg-canvas"
            >
              <option value="">Sin doc.</option>
              <option value="DNI">DNI</option>
              <option value="CUIL">CUIL</option>
            </select>
            <input
              type="text"
              value={documentoValor}
              onChange={(e) => setDocumentoValor(e.target.value)}
              disabled={!documentoTipo}
              placeholder={documentoTipo ? `Número de ${documentoTipo}` : 'Elegí un tipo primero'}
              className="flex-1 px-2 py-1.5 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent outline-none bg-canvas disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          crearClienteRapido();
        }}
        disabled={creando || !nombreLimpio}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-accent-ink hover:bg-canvas cursor-pointer border-t border-line disabled:opacity-50 disabled:cursor-wait"
      >
        <UserPlus className="w-4 h-4" />
        {creando ? 'Creando...' : `Crear cliente "${nombreLimpio}"`}
      </button>
    </div>
  );
}
