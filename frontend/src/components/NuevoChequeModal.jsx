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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-visible my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Registrar Cheque Manual</h2>
              <p className="text-sm text-gray-500">Ingreso de cheque externo o propio</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Cheque</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, esEmisionPropia: false }))}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    !formData.esEmisionPropia
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  De Cliente para mí
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, esEmisionPropia: true }))}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    formData.esEmisionPropia
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  De mí para Cliente
                </button>
              </div>
            </div>

            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (Opcional)</label>
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
                      setFormData(prev => ({ ...prev, clienteId: '' }));
                    }
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Buscar cliente..."
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <div 
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-500 italic border-b border-gray-100"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, clienteId: '' }));
                      setSearchCliente('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    -- Sin Cliente / Cheque Suelto --
                  </div>
                  {filteredClientes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No se encontraron clientes</div>
                  ) : (
                    filteredClientes.map(c => (
                      <div 
                        key={c.id} 
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-gray-900 border-b border-gray-50 last:border-0"
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
              
              <p className="text-xs text-gray-500 mt-2">
                {formData.clienteId 
                  ? (formData.esEmisionPropia 
                      ? "Este cheque se registrará a nombre del cliente y AUMENTARÁ su deuda (o reducirá su saldo a favor)." 
                      : "Este cheque sumará SALDO A FAVOR en la cuenta corriente del cliente.")
                  : "Si no selecciona cliente, el cheque quedará registrado sin afectar ninguna cuenta."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                <input
                  type="text"
                  name="banco"
                  value={formData.banco}
                  onChange={handleChange}
                  placeholder="Ej: Banco Nación"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Serie</label>
                <input
                  type="text"
                  name="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={handleChange}
                  placeholder="Ej: 12345678"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Emisión</label>
                <input
                  type="date"
                  name="fechaRecepcion"
                  required
                  value={formData.fechaRecepcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Cobro</label>
                <input
                  type="date"
                  name="fechaCobro"
                  value={formData.fechaCobro}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-medium">$</span>
                </div>
                <FormattedNumberInput
                  id="monto"
                  required
                  value={formData.monto}
                  onChange={(val) => setFormData(prev => ({ ...prev, monto: val }))}
                  className="w-full pl-8 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Ej: 150000"
                />
              </div>
            </div>

          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || !formData.monto}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
