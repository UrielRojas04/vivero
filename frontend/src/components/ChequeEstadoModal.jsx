import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../store/useUIStore';
import { chequesApi } from '../api/cheques.api';
import { clientesApi } from '../api/clientes.api';
import { X, Check, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { describirEstadoCheque } from '../utils/chequeDisplay';

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

  // Inicializar estado cuando se abre el modal y se pasa un cheque.
  // Un cheque ENTREGADO sólo admite una transición (rebote a RECHAZADO,
  // cheques-rebote-endosado Decisión 2/6): se preselecciona directamente,
  // el selector queda restringido a esa única opción.
  useEffect(() => {
    if (isOpen && cheque) {
      setEstadoEdit(cheque.estado === 'ENTREGADO' ? 'RECHAZADO' : cheque.estado);
      setEntregadoAEdit(cheque.entregadoA || '');
      setFechaEntregaEdit(cheque.fechaEntrega || '');
      setTipoEndoso('TERCERO');
      setEndosadoAClienteId('');
      setSearchCliente('');
      setIsDropdownOpen(false);
    }
  }, [isOpen, cheque]);

  // Open Question 1 de design.md, opción (c): un cheque ENTREGADO antes de
  // este change no persistió a su endosatario como relación. Si rebota, el
  // modal le pide al usuario elegirlo en este mismo momento, con el mismo
  // buscador de clientes que ya usa para endosar.
  const esReboteDeChequeEndosado = cheque && cheque.estado === 'ENTREGADO';
  const necesitaSeleccionarEndosatario = esReboteDeChequeEndosado && !cheque.endosadoAClienteId;

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

    // Open Question 1, opción (c): cheque ENTREGADO preexistente sin endosatario
    // persistido. El usuario debe elegir el cliente o marcar explícitamente que
    // fue un tercero antes de poder registrar el rebote.
    if (necesitaSeleccionarEndosatario && tipoEndoso === 'CLIENTE' && !endosadoAClienteId) {
      return pushToast('error', 'Debe seleccionar el cliente al que se le había endosado el cheque, o indicar que fue un tercero.');
    }

    let payload;
    if (esReboteDeChequeEndosado) {
      // Rebote de un cheque endosado: no se manda entregadoA ni fechaEntrega en
      // null (tarea 7.6) — el backend preserva esos datos tal cual estaban.
      payload = { estado: estadoEdit };
      if (necesitaSeleccionarEndosatario && tipoEndoso === 'CLIENTE' && endosadoAClienteId) {
        payload.endosadoAClienteId = parseInt(endosadoAClienteId, 10);
      }
    } else {
      payload = {
        estado: estadoEdit,
        fechaEntrega: estadoEdit === 'ENTREGADO' ? fechaEntregaEdit : null,
        entregadoA: estadoEdit === 'ENTREGADO' && tipoEndoso === 'TERCERO' ? entregadoAEdit : null,
        endosadoAClienteId: estadoEdit === 'ENTREGADO' && tipoEndoso === 'CLIENTE' ? parseInt(endosadoAClienteId, 10) : null
      };
    }

    if (estadoEdit === 'RECHAZADO' && cheque.estado !== 'RECHAZADO') {
      if (esReboteDeChequeEndosado) {
        const montoTexto = cheque.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
        const clienteOriginalNombre = cheque.clienteNombre || 'el cliente original';
        const endosatarioNombre = cheque.endosadoAClienteNombre
          || (necesitaSeleccionarEndosatario && tipoEndoso === 'CLIENTE' ? searchCliente : null)
          || cheque.entregadoA
          || 'el endosatario';
        const hayEndosatarioCliente = !!cheque.endosadoAClienteId
          || (necesitaSeleccionarEndosatario && tipoEndoso === 'CLIENTE' && !!endosadoAClienteId);

        const message = hayEndosatarioCliente
          ? `Vas a registrar el rebote de este cheque endosado, por ${montoTexto}.\n\nSe le AUMENTARÁ LA DEUDA a ${clienteOriginalNombre} en ${montoTexto}, y se le ACREDITARÁ SALDO A FAVOR a ${endosatarioNombre} por ese mismo monto.\n\nEsta acción NO SE PUEDE DESHACER.\n\n¿Estás seguro de que deseas continuar?`
          : `Vas a registrar el rebote de este cheque endosado, por ${montoTexto}.\n\nSe le AUMENTARÁ LA DEUDA a ${clienteOriginalNombre} en ${montoTexto}. El destinatario del endoso (${endosatarioNombre}) no es un cliente del sistema, así que no tiene cuenta corriente que ajustar: sólo se mueve esa cuenta.\n\nEsta acción NO SE PUEDE DESHACER.\n\n¿Estás seguro de que deseas continuar?`;

        askConfirm({
          title: 'Atención: Rebote de Cheque Endosado',
          message,
          variant: 'danger',
          confirmLabel: 'Sí, registrar rebote',
          onConfirm: () => updateMutation.mutate({ id: cheque.id, payload })
        });
        return;
      }

      askConfirm({
        title: 'Atención: Reversa Contable',
        message: 'Marcar un cheque como RECHAZADO revertirá los saldos en la cuenta corriente del cliente (afectando deudas y saldos a favor) y NO SE PUEDE DESHACER.\n\n¿Estás seguro de que deseas continuar?',
        variant: 'danger',
        confirmLabel: 'Sí, rechazar cheque',
        onConfirm: () => updateMutation.mutate({ id: cheque.id, payload })
      });
      return;
    }

    if (estadoEdit === 'ENTREGADO' && cheque.estado !== 'ENTREGADO') {
      const destinatario = tipoEndoso === 'TERCERO' ? entregadoAEdit : searchCliente;
      const advertenciaSaldo = tipoEndoso === 'CLIENTE'
        ? `El monto del cheque impactará en la cuenta corriente de ${destinatario} (se sumará como un pago a su favor). `
        : '';
      askConfirm({
        title: 'Atención: Endoso de Cheque',
        message: `Vas a endosar este cheque a ${destinatario || 'el destinatario indicado'}. ${advertenciaSaldo}El cheque quedará BLOQUEADO para futuras ediciones y esta acción NO SE PUEDE DESHACER.\n\n¿Estás seguro de que deseas continuar?`,
        variant: 'danger',
        confirmLabel: 'Sí, endosar cheque',
        onConfirm: () => updateMutation.mutate({ id: cheque.id, payload })
      });
      return;
    }

    if (estadoEdit === 'COBRADO' && cheque.estado !== 'COBRADO') {
      const etiquetaCobro = cheque.esEmisionPropia ? 'DEBITADO' : 'COBRADO';
      askConfirm({
        title: 'Atención: Cheque Cobrado',
        message: `Vas a marcar este cheque como ${etiquetaCobro}. El cheque quedará BLOQUEADO para futuras ediciones y esta acción NO SE PUEDE DESHACER.\n\n¿Estás seguro de que deseas continuar?`,
        variant: 'danger',
        confirmLabel: 'Sí, marcar como cobrado',
        onConfirm: () => updateMutation.mutate({ id: cheque.id, payload })
      });
      return;
    }

    updateMutation.mutate({ id: cheque.id, payload });
  };

  const filteredClientes = (Array.isArray(clientesData) ? clientesData : [])
    .filter(c => c.nombreRazonSocial.toLowerCase().includes(searchCliente.toLowerCase()));

  if (!isOpen || !cheque) return null;

  const { etiqueta: etiquetaEstadoActual, tono: tonoEstadoActual } = describirEstadoCheque(cheque);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white w-full h-full sm:h-auto max-w-md rounded-none sm:rounded-2xl shadow-xl flex flex-col max-h-screen sm:max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex-none flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Actualizar Estado</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Estado actual:</span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${tonoEstadoActual.chip}`}>{etiquetaEstadoActual}</span>
            </div>
            <p><span className="text-gray-500">Banco:</span> <span className="font-semibold text-gray-900">{cheque.banco || '-'}</span></p>
            <p className="text-2xl font-bold text-emerald-700 pt-1">{cheque.monto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</p>
            <p><span className="text-gray-500">Origen:</span> <span className="font-semibold text-gray-900">{cheque.clienteNombre || 'Suelto'}</span></p>
          </div>

          <div className="space-y-4">
            {esReboteDeChequeEndosado && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                Este cheque está <span className="font-semibold">endosado</span>
                {cheque.entregadoA ? <> a <span className="font-semibold">{cheque.entregadoA}</span></> : null}.
                La única acción posible es registrar su rebote.
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
              <select
                value={estadoEdit}
                onChange={(e) => setEstadoEdit(e.target.value)}
                disabled={esReboteDeChequeEndosado}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow disabled:bg-gray-100 disabled:text-gray-500"
              >
                {esReboteDeChequeEndosado ? (
                  <option value="RECHAZADO">RECHAZADO (Rebote de cheque endosado)</option>
                ) : (
                  <>
                    <option value="EN_CARTERA">{cheque.esEmisionPropia ? "EMITIDO (Pendiente de cobro)" : "EN CARTERA"}</option>
                    <option value="COBRADO">{cheque.esEmisionPropia ? "DEBITADO (Cobrado de tu cuenta)" : "COBRADO (Depositado)"}</option>
                    {!cheque.esEmisionPropia && (
                      <option value="ENTREGADO">ENTREGADO (Endosado/Tercero)</option>
                    )}
                    <option value="RECHAZADO">RECHAZADO</option>
                  </>
                )}
              </select>
            </div>

            {necesitaSeleccionarEndosatario && (
              <div className="space-y-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ¿A quién se le había endosado este cheque?
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Este cheque fue entregado antes de que el sistema pudiera identificar al
                    endosatario como cliente. Elegilo para que se le acredite el saldo a favor
                    correspondiente, o indicá que fue un tercero.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      tipoEndoso === 'CLIENTE' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="tipoEndosatarioRebote"
                        value="CLIENTE"
                        checked={tipoEndoso === 'CLIENTE'}
                        onChange={() => setTipoEndoso('CLIENTE')}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-gray-800">Fue un cliente</span>
                    </label>
                    <label className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      tipoEndoso === 'TERCERO' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="tipoEndosatarioRebote"
                        value="TERCERO"
                        checked={tipoEndoso === 'TERCERO'}
                        onChange={() => setTipoEndoso('TERCERO')}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-gray-800">Fue un tercero, no un cliente</span>
                    </label>
                  </div>
                </div>

                {tipoEndoso === 'CLIENTE' && (
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>

                    {isDropdownOpen && (
                      <div className="static sm:absolute sm:z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
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
                      Se le acreditará el monto del cheque como saldo a favor en su cuenta corriente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {estadoEdit === 'ENTREGADO' && (
              <div className="space-y-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Endosar a:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      tipoEndoso === 'TERCERO' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="tipoEndoso"
                        value="TERCERO"
                        checked={tipoEndoso === 'TERCERO'}
                        onChange={() => setTipoEndoso('TERCERO')}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-gray-800">Persona / Tercero</span>
                    </label>
                    <label className={`flex items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      tipoEndoso === 'CLIENTE' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
                    }`}>
                      <input
                        type="radio"
                        name="tipoEndoso"
                        value="CLIENTE"
                        checked={tipoEndoso === 'CLIENTE'}
                        onChange={() => setTipoEndoso('CLIENTE')}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-gray-800">Cliente (con cuenta)</span>
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
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>

                    {isDropdownOpen && (
                      /* D5: en mobile la lista se renderiza EN FLUJO (empuja el contenido del
                         cuerpo scrolleable) para no quedar recortada por overflow-y-auto del
                         panel; desde sm: (>=640px) vuelve a flotar como antes. */
                      <div className="static sm:absolute sm:z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
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
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer fijo */}
        <div className="flex-none flex gap-3 p-6 border-t border-gray-100 sm:justify-end">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-5 py-2.5 text-gray-600 hover:bg-gray-50 font-semibold rounded-xl border border-transparent transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
