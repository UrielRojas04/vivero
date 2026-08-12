import React, { useState, useEffect } from 'react';
import { X, Sprout, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';

const SiembraForm = ({ isOpen, siembra, onSave, onCancel }) => {
  const [busquedaPlanta, setBusquedaPlanta] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [formData, setFormData] = useState({
    variedadPlantaId: '',
    variedadBandejaId: '',
    fechaEstimada: '',
    dueno: '',
    numeroLote: '',
    cantidad: ''
  });

  const { data: plantas = [] } = useQuery({
    queryKey: ['variedades-plantas'],
    queryFn: async () => {
      const res = await variedadesPlantasApi.getAll();
      return res.data;
    },
    enabled: isOpen
  });

  const { data: bandejas = [] } = useQuery({
    queryKey: ['variedades-bandejas'],
    queryFn: async () => {
      const res = await variedadesBandejasApi.getAll();
      return res.data;
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (isOpen) {
      if (siembra) {
        setFormData({
          variedadPlantaId: siembra.variedadPlanta?.id || '',
          variedadBandejaId: siembra.variedadBandeja?.id || '',
          fechaEstimada: siembra.fechaEstimada || '',
          dueno: siembra.dueno || '',
          numeroLote: siembra.numeroLote || '',
          cantidad: siembra.cantidad || ''
        });
        setBusquedaPlanta(siembra.variedadPlanta?.nombre || '');
      } else {
        setFormData({
          variedadPlantaId: '',
          variedadBandejaId: '',
          fechaEstimada: '',
          dueno: '',
          numeroLote: '',
          cantidad: ''
        });
        setBusquedaPlanta('');
      }
      setShowDropdown(false);
    }
  }, [isOpen, siembra]);

  const plantasFiltradas = busquedaPlanta 
    ? plantas.filter(p => p.nombre.toLowerCase().includes(busquedaPlanta.toLowerCase()))
    : plantas;

  const obtenerDiasCrecimiento = (planta, date = new Date()) => {
    const mes = date.getMonth(); // 0 a 11
    const mesesMapping = [
      'diasEnero', 'diasFebrero', 'diasMarzo', 'diasAbril',
      'diasMayo', 'diasJunio', 'diasJulio', 'diasAgosto',
      'diasSeptiembre', 'diasOctubre', 'diasNoviembre', 'diasDiciembre'
    ];
    return planta[mesesMapping[mes]] || 0;
  };

  const seleccionarPlanta = (planta) => {
    setBusquedaPlanta(planta.nombre);
    setShowDropdown(false);
    const id = planta.id.toString();
    
    const dias = obtenerDiasCrecimiento(planta);
    if (dias > 0) {
      const date = new Date();
      date.setDate(date.getDate() + dias);
      setFormData(prev => ({
        ...prev,
        variedadPlantaId: id,
        fechaEstimada: date.toISOString().split('T')[0]
      }));
    } else {
      setFormData(prev => ({ ...prev, variedadPlantaId: id }));
    }
  };

  // handlePlantaChange eliminado porque ahora usamos seleccionarPlanta

  const handleBandejaChange = (e) => {
    const id = e.target.value;
    const bandeja = bandejas.find(b => b.id.toString() === id);
    if (bandeja && bandeja.cantidadCeldas) {
      setFormData(prev => ({
        ...prev,
        variedadBandejaId: id,
        cantidad: bandeja.cantidadCeldas.toString()
      }));
    } else {
      setFormData(prev => ({ ...prev, variedadBandejaId: id }));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      variedadPlanta: formData.variedadPlantaId ? { id: parseInt(formData.variedadPlantaId, 10) } : null,
      variedadBandeja: formData.variedadBandejaId ? { id: parseInt(formData.variedadBandejaId, 10) } : null,
      cantidad: parseInt(formData.cantidad, 10)
    });
  };

  const isEditMode = !!siembra;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <Sprout className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? 'Editar Siembra' : 'Nueva Siembra'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variedad de Planta *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required={!formData.variedadPlantaId}
                    placeholder="Buscar variedad..."
                    value={busquedaPlanta}
                    onChange={(e) => {
                      setBusquedaPlanta(e.target.value);
                      setShowDropdown(true);
                      if (formData.variedadPlantaId) {
                        setFormData(prev => ({ ...prev, variedadPlantaId: '' }));
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => {
                      // Pequeño delay para permitir el click en la opción
                      setTimeout(() => setShowDropdown(false), 200);
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  {showDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {plantasFiltradas.length > 0 ? (
                        plantasFiltradas.map(p => (
                          <div 
                            key={p.id} 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              seleccionarPlanta(p);
                            }}
                            className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                          >
                            {p.nombre}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">No se encontraron plantas</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Bandeja *
                </label>
                <select
                  required
                  value={formData.variedadBandejaId}
                  onChange={handleBandejaChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white"
                >
                  <option value="">Seleccionar bandeja...</option>
                  {bandejas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Lote *
                </label>
                <input
                  type="text"
                  required
                  value={formData.numeroLote}
                  onChange={(e) => setFormData({ ...formData, numeroLote: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Inicial *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dueño *
                </label>
                <input
                  type="text"
                  required
                  value={formData.dueno}
                  onChange={(e) => setFormData({ ...formData, dueno: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  placeholder="Ej: Vivero o Cliente X"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Est. de Entrega *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fechaEstimada}
                  onChange={(e) => setFormData({ ...formData, fechaEstimada: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-xl hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors cursor-pointer"
            >
              Guardar Siembra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SiembraForm;
