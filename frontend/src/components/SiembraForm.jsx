import React, { useState, useEffect } from 'react';
import { X, Sprout, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import { clientesApi } from '../api/clientes.api';

const SiembraForm = ({ isOpen, siembra, onSave, onCancel }) => {
  const [busquedaPlanta, setBusquedaPlanta] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [busquedaDueno, setBusquedaDueno] = useState('');
  const [showDuenoDropdown, setShowDuenoDropdown] = useState(false);
  const [tipoDueno, setTipoDueno] = useState('jefe');
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

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      return await clientesApi.getAll();
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
        setBusquedaDueno(siembra.dueno || '');
        setTipoDueno((siembra.dueno && siembra.dueno !== 'Jefe / Vivero propio') ? 'cliente' : 'jefe');
      } else {
        setFormData({
          variedadPlantaId: '',
          variedadBandejaId: '',
          fechaEstimada: '',
          dueno: 'Jefe / Vivero propio',
          numeroLote: '',
          cantidad: ''
        });
        setBusquedaPlanta('');
        setBusquedaDueno('');
        setTipoDueno('jefe');
      }
      setShowDropdown(false);
      setShowDuenoDropdown(false);
    }
  }, [isOpen, siembra]);

  const plantasFiltradas = busquedaPlanta 
    ? plantas.filter(p => p.nombre.toLowerCase().includes(busquedaPlanta.toLowerCase()))
    : plantas;

  const clientesMapeados = clientes.map(c => ({ id: c.id, nombre: c.nombreRazonSocial || `Cliente #${c.id}` }));

  const duenosFiltrados = busquedaDueno 
    ? clientesMapeados.filter(d => d.nombre.toLowerCase().includes(busquedaDueno.toLowerCase()))
    : clientesMapeados;

  const seleccionarDueno = (duenoNombre) => {
    setBusquedaDueno(duenoNombre);
    setFormData(prev => ({ ...prev, dueno: duenoNombre }));
    setShowDuenoDropdown(false);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />
      
      {/* Modal Content */}
      <div className="bg-white rounded-none sm:rounded-2xl w-full h-full sm:h-auto max-w-lg overflow-hidden shadow-xl z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-screen sm:max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
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

        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  Cantidad Inicial (Bandejas) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    min="1"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  {formData.cantidad && formData.variedadBandejaId && (
                    <div className="absolute right-0 top-full mt-1 text-xs text-emerald-600 font-medium">
                      {
                        (() => {
                          const bandeja = bandejas.find(b => b.id.toString() === formData.variedadBandejaId);
                          const celdas = bandeja?.cantidadCeldas || 0;
                          const total = Math.round(parseFloat(formData.cantidad) * celdas);
                          return total.toLocaleString('es-AR');
                        })()
                      } semillas
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dueño *
                </label>
                <select
                  value={tipoDueno}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTipoDueno(val);
                    if (val === 'jefe') {
                      setFormData({ ...formData, dueno: 'Jefe / Vivero propio' });
                    } else {
                      setFormData({ ...formData, dueno: busquedaDueno });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white mb-2"
                >
                  <option value="jefe">Jefe / Vivero propio</option>
                  <option value="cliente">Cliente</option>
                </select>

                {tipoDueno === 'cliente' && (
                  <div className="relative mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Buscar cliente..."
                      value={busquedaDueno}
                      onChange={(e) => {
                        setBusquedaDueno(e.target.value);
                        setFormData({ ...formData, dueno: e.target.value });
                        setShowDuenoDropdown(true);
                      }}
                      onFocus={() => setShowDuenoDropdown(true)}
                      onBlur={() => {
                        setTimeout(() => setShowDuenoDropdown(false), 200);
                      }}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    {showDuenoDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {duenosFiltrados.length > 0 ? (
                          duenosFiltrados.map(d => (
                            <div 
                              key={d.id} 
                              onMouseDown={(e) => {
                                e.preventDefault();
                                seleccionarDueno(d.nombre);
                              }}
                              className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                            >
                              {d.nombre}
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {busquedaDueno ? 'Presione Enter para usar este nombre' : 'No hay clientes'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
