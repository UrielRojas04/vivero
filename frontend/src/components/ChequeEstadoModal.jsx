import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../store/useUIStore';
import { chequesApi } from '../api/cheques.api';
import { clientesApi } from '../api/clientes.api';
import { X, Check, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ChequeEstadoModal({ isOpen, onClose, cheque }) {
  const { pushToast, askConfirm } = useUIStore();
  const queryClient = useQueryClient();
  
  const [estadoEdit, setEstadoEdit] = useState('');
  const [tipoEndoso, setTipoEndoso] = useState('TERCERO');
  const [entregadoAEdit, setEntregadoAEdit] = useState('');
  const [endosadoAClienteId, setEndosadoAClienteId] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [fechaEntregaEdit, setFechaEntregaEdit] = useState('');
  const dropdownRef = useRef(null);

  // Inicializar estado cuando se abre el modal y se pasa un cheque
  useEffect(() => {
    if (isOpen && cheque) {
      setEstadoEdit(cheque.estado);
      setEntregadoAEdit(cheque.entregadoA || '');
      setFechaEntregaEdit(cheque.fechaEntrega || '');
      setTipoEndoso('TERCERO');
      setEndosadoAClienteId('');
      setSearchCliente('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, cheque]);

  const { data: clientesData } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesApi.getAll(),
    enabled: isOpen
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => chequesApi.update(id, payload),
    onSuccess: () => {
      pushToast('success', 'Cheque actualizado exitosamente');
      queryClient.invalidateQueries(['cheques']);
      queryClient.invalidateQueries(['finanzas']);
      queryClient.invalidateQueries(['clientes']);
      onClose();
    },
    onError: () => {
      pushToast('error', 'Error al actualizar el cheque');
    }
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpdate = () => {
    if (estadoEdit === 'ENTREGADO') {
      if (tipoEndoso === 'TERCERO' && !entregadoAEdit) {
        return pushToast('error', 'Debe indicar a quién fue entregado el cheque.');
      }
      if (tipoEndoso === 'CLIENTE' && !endosadoAClienteId) {
        return pushToast('error', 'Debe seleccionar un cliente para endosar el cheque.');
      }
    }

    const payload = {
      estado: estadoEdit,
      fechaEntrega: estadoEdit === 'ENTREGADO' ? fechaEntregaEdit : null,
      entregadoA: estadoEdit === 'ENTREGADO' && tipoEndoso === 'TERCERO' ? entregadoAEdit : null,
      endosadoAClienteId: estadoEdit === 'ENTREGADO' && tipoEndoso === 'CLIENTE' ? parseInt(endosadoAClienteId, 10) : null
    };

    if (estadoEdit === 'RECHAZADO' && cheque.estado !== 'RECHAZADO') {
      askConfirm({
        title: 'Atención: Reversa Contable',
        message: 'Marcar un cheque como RECHAZADO revertirá los saldos en la cuenta corriente del cliente (afectando deudas y saldos a favor) y NO SE PUEDE DESHACER.\n\n¿Estás seguro de que deseas continuar?',
        variant: 'danger',
        confirmLabel: 'Sí, rechazar cheque',
        onConfirm: () => updateMutation.mutate({ id: cheque.id, payload })
      });
      return;
    }

    updateMutation.mutate({ id: cheque.id, payload });
  };

  const filteredClientes = (Array.isArray(clientesData) ? clientesData : [])
    .filter(c => c.nombreRazonSocial.toLowerCase().includes(searchCliente.toLowerCase()));

  if (!isOpen || !cheque) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8 animate-in fade-in zoom-in-95 duration-200 overflow-visible">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Actualizar Estado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-2 text-sm">
          <p><span className="text-gray-500">Banco:</span> <span className="font-semibold text-gray-900">{cheque.banco || '-'}</span></p>
          <p><span className="text-gray-500">Monto:</span> <span className="font-bold text-emerald-700">{cheque.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span></p>
          <p><span className="text-gray-500">Origen:</span> <span className="font-semibold text-gray-900">{cheque.clienteNombre || 'Suelto'}</span></p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
            <select
              value={estadoEdit}
              onChange={(e) => setEstadoEdit(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
            >
              <option value="EN_CARTERA">{cheque.esEmisionPropia ? "EMITIDO (Pendiente de cobro)" : "EN CARTERA"}</option>
              <option value="COBRADO">{cheque.esEmisionPropia ? "DEBITADO (Cobrado de tu cuenta)" : "COBRADO (Depositado)"}</option>
              {!cheque.esEmisionPropia && (
                <option value="ENTREGADO">ENTREGADO (Endosado/Tercero)</option>
              )}
              <option value="RECHAZADO">RECHAZADO</option>
            </select>
          </div>

          {estadoEdit === 'ENTREGADO' && (
            <div className="space-y-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Endosar a:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="tipoEndoso" 
                      value="TERCERO" 
                      checked={tipoEndoso === 'TERCERO'} 
                      onChange={() => setTipoEndoso('TERCERO')} 
                      className="accent-emerald-600"
                    />
                    <span className="text-sm">Persona / Tercero</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="tipoEndoso" 
                      value="CLIENTE" 
                      checked={tipoEndoso === 'CLIENTE'} 
                      onChange={() => setTipoEndoso('CLIENTE')} 
                      className="accent-emerald-600"
                    />
                    <span className="text-sm">Cliente (con cuenta)</span>
                  </label>
                </div>
              </div>

              {tipoEndoso === 'TERCERO' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre (Proveedor/Tercero)</label>
                  <input
                    type="text"
                    value={entregadoAEdit}
                    onChange={(e) => setEntregadoAEdit(e.target.value)}
                    placeholder="Ej: Macetas Plásticas S.A."
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              ) : (
                <div ref={dropdownRef} className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar Cliente</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchCliente}
                      onChange={(e) => {
                        setSearchCliente(e.target.value);
                        setIsDropdownOpen(true);
                        if (e.target.value === '') {
                          setEndosadoAClienteId('');
                        }
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Buscar cliente..."
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    />
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredClientes.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No se encontraron clientes</div>
                      ) : (
                        filteredClientes.map(c => (
                          <div 
                            key={c.id} 
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-900 border-b border-gray-50 last:border-0"
                            onClick={() => {
                              setEndosadoAClienteId(c.id);
                              setSearchCliente(c.nombreRazonSocial);
                              setIsDropdownOpen(false);
                            }}
                          >
                            {c.nombreRazonSocial}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Al endosar a un cliente, el monto del cheque se sumará a su deuda como si le hubieras realizado un pago a su favor.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Entrega</label>
                <input
                  type="date"
                  value={fechaEntregaEdit}
                  onChange={(e) => setFechaEntregaEdit(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl border border-transparent transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
