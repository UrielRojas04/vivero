import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, CreditCard, Search } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientesApi } from '../api/clientes.api';
import { chequesApi } from '../api/cheques.api';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import FormattedNumberInput from './FormattedNumberInput';

const NuevoChequeModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    clienteId: '',
    banco: '',
    numeroSerie: '',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    fechaCobro: '',
    monto: '',
    esEmisionPropia: false
  });

  const [searchCliente, setSearchCliente] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const queryClient = useQueryClient();
  const { pushToast } = useUIStore();

  const { data: clientesData } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesApi.getAll(),
    enabled: isOpen
  });

  const createMutation = useMutation({
    mutationFn: (payload) => chequesApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['cheques']);
      queryClient.invalidateQueries(['clientes']);
      pushToast('success', 'Cheque registrado correctamente.');
      onClose();
    },
    onError: (error) => {
      pushToast('error', getErrorMessage(error, 'Error al registrar el cheque.'));
    }
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        clienteId: '',
        banco: '',
        numeroSerie: '',
        fechaRecepcion: new Date().toISOString().split('T')[0],
        fechaCobro: '',
        monto: '',
        esEmisionPropia: false
      });
      setSearchCliente('');
      setIsDropdownOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      return pushToast('error', 'El monto debe ser mayor a 0');
    }
    if (formData.numeroSerie && formData.numeroSerie.length !== 8) {
      return pushToast('error', 'El número de cheque debe tener exactamente 8 dígitos.');
    }

    const payload = {
      ...formData,
      monto: parseFloat(formData.monto),
      clienteId: formData.clienteId ? parseInt(formData.clienteId, 10) : null
    };

    createMutation.mutate(payload);
  };

  const filteredClientes = (Array.isArray(clientesData) ? clientesData : [])
    .filter(c => c.nombreRazonSocial.toLowerCase().includes(searchCliente.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-paper w-full h-full sm:h-auto max-w-lg rounded-none sm:rounded-panel border border-line-strong flex flex-col max-h-screen sm:max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex-none flex items-center justify-between p-6 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-soft rounded-base">
              <CreditCard className="w-5 h-5 text-accent-ink" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Registrar Cheque Manual</h2>
              <p className="text-sm text-muted">Ingreso de cheque externo o propio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-faint hover:text-body hover:bg-canvas rounded-base transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-body mb-2">Tipo de Cheque</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, esEmisionPropia: false }))}
                  className={`flex items-center justify-center p-3 rounded-base border-2 transition-all cursor-pointer ${
                    !formData.esEmisionPropia
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-muted hover:bg-canvas'
                  }`}
                >
                  De Cliente para mí
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, esEmisionPropia: true }))}
                  className={`flex items-center justify-center p-3 rounded-base border-2 transition-all cursor-pointer ${
                    formData.esEmisionPropia
                      ? 'border-accent bg-accent-soft text-accent-ink font-bold'
                      : 'border-line bg-paper text-muted hover:bg-canvas'
                  }`}
                >
                  De mí para Cliente
                </button>
              </div>
            </div>

            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium text-body mb-1">Cliente (Opcional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-faint" />
                </div>
                <input
                  type="text"
                  value={searchCliente}
                  onChange={(e) => {
                    setSearchCliente(e.target.value);
                    setIsDropdownOpen(true);
                    if (e.target.value === '') {
                      setFormData(prev => ({ ...prev, clienteId: '' }));
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-10 pr-4 py-2.5 bg-paper border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all"
                />
              </div>

              {isDropdownOpen && (
                /* D5: en mobile la lista se renderiza EN FLUJO (empuja el contenido del
                   cuerpo scrolleable) para no quedar recortada por overflow-y-auto del
                   panel; desde sm: (>=640px) vuelve a flotar como antes. */
                <div className="static sm:absolute sm:z-10 w-full mt-1 bg-paper border border-line-strong rounded-panel max-h-60 overflow-y-auto">
                  <div
                    className="px-4 py-3 hover:bg-canvas cursor-pointer text-muted italic border-b border-line"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, clienteId: '' }));
                      setSearchCliente('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    -- Sin Cliente / Cheque Suelto --
                  </div>
                  {filteredClientes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted">No se encontraron clientes</div>
                  ) : (
                    filteredClientes.map(c => (
                      <div
                        key={c.id}
                        className="px-4 py-3 hover:bg-canvas cursor-pointer text-ink border-b border-line last:border-0"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, clienteId: c.id }));
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

              <p className="text-xs text-muted mt-2">
                {formData.clienteId
                  ? (formData.esEmisionPropia
                      ? "Este cheque se registrará a nombre del cliente y AUMENTARÁ su deuda (o reducirá su saldo a favor)."
                      : "Este cheque sumará SALDO A FAVOR en la cuenta corriente del cliente.")
                  : "Si no selecciona cliente, el cheque quedará registrado sin afectar ninguna cuenta."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Banco</label>
                <input
                  type="text"
                  name="banco"
                  value={formData.banco}
                  onChange={handleChange}
                  placeholder="Ej: Banco Nación"
                  className="w-full px-4 py-2.5 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1">N° de Serie</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={(e) => {
                    // Pedido del dueño 2026-09-06: "a veces hay cheques truchos que tienen más o
                    // menos dígitos" -- 8 dígitos exactos, filtrando cualquier cosa que no sea
                    // número a medida que se tipea (mismo criterio que ya se usa en otros campos
                    // numéricos de esta app), en vez de sólo validar recién al guardar.
                    const soloDigitos = e.target.value.replace(/\D/g, '').slice(0, 8);
                    setFormData(prev => ({ ...prev, numeroSerie: soloDigitos }));
                  }}
                  placeholder="Ej: 12345678"
                  className="w-full px-4 py-2.5 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Fecha Emisión</label>
                <input
                  type="date"
                  name="fechaRecepcion"
                  required
                  value={formData.fechaRecepcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-body mb-1">Fecha de Cobro</label>
                <input
                  type="date"
                  name="fechaCobro"
                  value={formData.fechaCobro}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-body mb-1">Monto *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted font-medium">$</span>
                </div>
                <FormattedNumberInput
                  id="monto"
                  required
                  value={formData.monto}
                  onChange={(val) => setFormData(prev => ({ ...prev, monto: val }))}
                  decimales={0}
                  className="w-full pl-8 pr-4 py-2.5 bg-paper border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all font-mono tabular-nums"
                  placeholder="Ej: 150000"
                />
              </div>
            </div>

          </div>
        </div>

          <div className="flex-none flex gap-3 p-6 border-t border-line sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-body hover:bg-canvas rounded-base transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !formData.monto}
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-paper bg-accent hover:brightness-95 rounded-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Cheque
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevoChequeModal;
