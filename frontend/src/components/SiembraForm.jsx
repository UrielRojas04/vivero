import React, { useState, useEffect } from 'react';
import { X, Sprout, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { variedadesPlantasApi } from '../api/variedades-plantas.api';
import { variedadesBandejasApi } from '../api/variedades-bandejas.api';
import { clientesApi } from '../api/clientes.api';
import FormattedNumberInput from './FormattedNumberInput';

const SiembraForm = ({ isOpen, siembra, onSave, onCancel }) => {
  const [busquedaPlanta, setBusquedaPlanta] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [busquedaDueno, setBusquedaDueno] = useState('');
  const [showDuenoDropdown, setShowDuenoDropdown] = useState(false);
  const [tipoDueno, setTipoDueno] = useState('jefe');
  const [modoFechaSiembra, setModoFechaSiembra] = useState('UN_DIA');
  const [formData, setFormData] = useState({
    variedadPlantaId: '',
    variedadBandejaId: '',
    fechaEstimada: '',
    fechaSiembraInicio: '',
    fechaSiembraFin: '',
    dueno: '',
    codigoLote: '',
    numeroSiembra: '',
    tipoOrigen: 'SOBRE',
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
        const fechaSiembraInicio = siembra.fechaSiembraInicio || '';
        const fechaSiembraFin = siembra.fechaSiembraFin || '';
        setFormData({
          variedadPlantaId: siembra.variedadPlanta?.id?.toString() || '',
          variedadBandejaId: siembra.variedadBandeja?.id?.toString() || '',
          fechaEstimada: siembra.fechaEstimada || '',
          fechaSiembraInicio,
          fechaSiembraFin,
          dueno: siembra.dueno || '',
          codigoLote: siembra.codigoLote || '',
          numeroSiembra: siembra.numeroSiembra || '',
          tipoOrigen: siembra.tipoOrigen || 'SOBRE',
          cantidad: siembra.cantidad || ''
        });
        setBusquedaPlanta(siembra.variedadPlanta?.nombre || '');
        setBusquedaDueno(siembra.dueno || '');
        setTipoDueno((siembra.dueno && siembra.dueno !== 'Jefe / Vivero propio') ? 'cliente' : 'jefe');
        setModoFechaSiembra(
          fechaSiembraFin && fechaSiembraFin !== fechaSiembraInicio ? 'RANGO' : 'UN_DIA'
        );
      } else {
        setFormData({
          variedadPlantaId: '',
          variedadBandejaId: '',
          fechaEstimada: '',
          fechaSiembraInicio: '',
          fechaSiembraFin: '',
          dueno: 'Jefe / Vivero propio',
          codigoLote: '',
          numeroSiembra: '',
          tipoOrigen: 'SOBRE',
          cantidad: ''
        });
        setBusquedaPlanta('');
        setBusquedaDueno('');
        setTipoDueno('jefe');
        setModoFechaSiembra('UN_DIA');
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

  // Calcula la fecha estimada de entrega a partir de una fecha base (la fecha de
  // fin de siembra), sumándole los días de crecimiento correspondientes al mes de
  // esa fecha base. Devuelve '' si falta la planta o la fecha base.
  const calcularFechaEstimada = (planta, fechaBase) => {
    if (!planta || !fechaBase) return '';
    const date = new Date(`${fechaBase}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const dias = obtenerDiasCrecimiento(planta, date);
    if (!dias || dias <= 0) return '';
    date.setDate(date.getDate() + dias);
    return date.toISOString().split('T')[0];
  };

  // Aplica cambios sobre las fechas de siembra y recalcula la fecha estimada de
  // entrega en base a fechaSiembraFin (último día sembrado), si hay una variedad
  // seleccionada. El usuario sigue pudiendo sobrescribir el valor propuesto a mano.
  const actualizarFechaSiembra = (updates) => {
    setFormData(prev => {
      const next = { ...prev, ...updates };
      const planta = plantas.find(p => p.id.toString() === prev.variedadPlantaId);
      if (planta) {
        const fechaEstimadaCalculada = calcularFechaEstimada(planta, next.fechaSiembraFin);
        if (fechaEstimadaCalculada) {
          next.fechaEstimada = fechaEstimadaCalculada;
        }
      }
      return next;
    });
  };

  const seleccionarPlanta = (planta) => {
    setBusquedaPlanta(planta.nombre);
    setShowDropdown(false);
    const id = planta.id.toString();

    setFormData(prev => {
      const fechaEstimadaCalculada = calcularFechaEstimada(planta, prev.fechaSiembraFin);
      return {
        ...prev,
        variedadPlantaId: id,
        ...(fechaEstimadaCalculada ? { fechaEstimada: fechaEstimadaCalculada } : {})
      };
    });
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Origen de la Semilla *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipoOrigen: 'SOBRE' }))}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    formData.tipoOrigen === 'SOBRE'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Sobre
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tipoOrigen: 'SUELTO' }))}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    formData.tipoOrigen === 'SUELTO'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Suelto
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.tipoOrigen === 'SOBRE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de Lote *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.codigoLote}
                    onChange={(e) => setFormData({ ...formData, codigoLote: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Siembra *
                </label>
                <input
                  type="text"
                  required
                  value={formData.numeroSiembra}
                  onChange={(e) => setFormData({ ...formData, numeroSiembra: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Inicial (Bandejas) *
                </label>
                <div className="relative">
                  <FormattedNumberInput
                    required
                    value={formData.cantidad}
                    onChange={(val) => setFormData({ ...formData, cantidad: val })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Siembra *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModoFechaSiembra('UN_DIA');
                    actualizarFechaSiembra({ fechaSiembraFin: formData.fechaSiembraInicio });
                  }}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    modoFechaSiembra === 'UN_DIA'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Un día
                </button>
                <button
                  type="button"
                  onClick={() => setModoFechaSiembra('RANGO')}
                  className={`flex items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    modoFechaSiembra === 'RANGO'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Rango de días
                </button>
              </div>
            </div>

            {modoFechaSiembra === 'UN_DIA' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Siembra *
                </label>
                <input
                  type="date"
                  required
                  value={formData.fechaSiembraInicio}
                  onChange={(e) => actualizarFechaSiembra({
                    fechaSiembraInicio: e.target.value,
                    fechaSiembraFin: e.target.value
                  })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sembrado Desde *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fechaSiembraInicio}
                    onChange={(e) => actualizarFechaSiembra({ fechaSiembraInicio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sembrado Hasta *
                  </label>
                  <input
                    type="date"
                    required
                    min={formData.fechaSiembraInicio}
                    value={formData.fechaSiembraFin}
                    onChange={(e) => actualizarFechaSiembra({ fechaSiembraFin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            )}

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
