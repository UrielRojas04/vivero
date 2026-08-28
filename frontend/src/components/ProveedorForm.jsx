import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';

// Modal con el shell fullscreen-mobile de ProductoForm.jsx (Decisión 12 de design.md de
// costeo-flexible-por-producto): overlay p-0 sm:p-4, panel w-full h-full sm:h-auto
// rounded-none sm:rounded-2xl, header/body/footer flex-none / flex-1 overflow-y-auto / flex-none.
//
// Grupo 4 de tasks.md de config-costeo-por-proveedor: el formulario crece de 3 inputs a dos
// secciones — "Datos" (lo que ya tenía) y "Costeo" (el perfil por defecto del proveedor,
// Decisión 1 de design.md). ⚠️ NO lleva ningún campo de cotización (OQ2): la cotización se pide
// en cada pedido, no en la ficha del proveedor. El envío tampoco admite un monto fijo (OQ11),
// sólo porcentaje.
const multiplicadorDescuento = (porcentajeVal) => {
  if (porcentajeVal === '' || porcentajeVal === null || porcentajeVal === undefined) return null;
  const p = parseFloat(porcentajeVal);
  if (Number.isNaN(p)) return null;
  return (1 - p / 100).toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

const ProveedorForm = ({ proveedor, isOpen, onSave, onCancel }) => {
  const [seccion, setSeccion] = useState('datos');

  // ---- Datos
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contacto, setContacto] = useState('');

  // ---- Costeo (perfil por defecto — Decisión 1 de design.md)
  const [ivaIncluidoEnPrecio, setIvaIncluidoEnPrecio] = useState(true);
  const [ivaPorDefectoPorcentaje, setIvaPorDefectoPorcentaje] = useState('');
  const [manejaDolares, setManejaDolares] = useState(false);
  const [costoEnvioPorDefectoPorcentaje, setCostoEnvioPorDefectoPorcentaje] = useState('');
  const [descuentosPorDefecto, setDescuentosPorDefecto] = useState([]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (proveedor) {
      setNombre(proveedor.nombre || '');
      setTelefono(proveedor.telefono || '');
      setContacto(proveedor.contacto || '');
      setIvaIncluidoEnPrecio(proveedor.ivaIncluidoEnPrecio !== undefined ? !!proveedor.ivaIncluidoEnPrecio : true);
      setIvaPorDefectoPorcentaje(
        proveedor.ivaPorDefectoPorcentaje !== null && proveedor.ivaPorDefectoPorcentaje !== undefined
          ? String(proveedor.ivaPorDefectoPorcentaje)
          : ''
      );
      setManejaDolares(!!proveedor.manejaDolares);
      setCostoEnvioPorDefectoPorcentaje(
        proveedor.costoEnvioPorDefectoPorcentaje !== null && proveedor.costoEnvioPorDefectoPorcentaje !== undefined
          ? String(proveedor.costoEnvioPorDefectoPorcentaje)
          : ''
      );
      setDescuentosPorDefecto(
        proveedor.descuentosPorDefecto && proveedor.descuentosPorDefecto.length > 0
          ? proveedor.descuentosPorDefecto.map((d) => ({ nombre: d.nombre || '', porcentaje: d.porcentaje ?? '' }))
          : []
      );
    } else {
      setNombre('');
      setTelefono('');
      setContacto('');
      setIvaIncluidoEnPrecio(true);
      setIvaPorDefectoPorcentaje('');
      setManejaDolares(false);
      setCostoEnvioPorDefectoPorcentaje('');
      setDescuentosPorDefecto([]);
    }
    setSeccion('datos');
    setErrors({});
  }, [proveedor, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!isOpen) return null;

  const handleDescuentoNombreChange = (index, val) => {
    setDescuentosPorDefecto(descuentosPorDefecto.map((d, i) => (i === index ? { ...d, nombre: val } : d)));
  };

  const handleDescuentoPorcentajeChange = (index, val) => {
    setDescuentosPorDefecto(descuentosPorDefecto.map((d, i) => (i === index ? { ...d, porcentaje: val } : d)));
  };

  const handleAddDescuento = () => {
    setDescuentosPorDefecto([...descuentosPorDefecto, { nombre: '', porcentaje: '' }]);
  };

  const handleRemoveDescuento = (index) => {
    setDescuentosPorDefecto(descuentosPorDefecto.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';

    const nombreFaltante = descuentosPorDefecto.some((d) => !d.nombre || !d.nombre.trim());
    const porcentajeInvalido = descuentosPorDefecto.some((d) => {
      const p = d.porcentaje === '' || d.porcentaje === null || d.porcentaje === undefined ? NaN : parseFloat(d.porcentaje);
      return Number.isNaN(p) || p < 0;
    });
    if (nombreFaltante) {
      newErrors.descuentos = 'Cada descuento debe tener un nombre.';
    } else if (porcentajeInvalido) {
      newErrors.descuentos = 'El porcentaje de cada descuento debe ser un número mayor o igual a 0.';
    }

    if (
      costoEnvioPorDefectoPorcentaje !== '' &&
      (Number.isNaN(parseFloat(costoEnvioPorDefectoPorcentaje)) || parseFloat(costoEnvioPorDefectoPorcentaje) < 0)
    ) {
      newErrors.envio = 'El envío por defecto no puede ser negativo.';
    }

    if (!ivaIncluidoEnPrecio) {
      const iva = ivaPorDefectoPorcentaje === '' ? NaN : parseFloat(ivaPorDefectoPorcentaje);
      if (Number.isNaN(iva) || iva < 0) {
        newErrors.iva = 'El IVA por defecto es obligatorio cuando el IVA no está incluido en el precio.';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setSeccion(newErrors.nombre ? 'datos' : 'costeo');
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      contacto: contacto.trim() || null,
      ivaIncluidoEnPrecio,
      ivaPorDefectoPorcentaje: ivaIncluidoEnPrecio
        ? null
        : (ivaPorDefectoPorcentaje !== '' ? parseFloat(ivaPorDefectoPorcentaje) : null),
      manejaDolares,
      costoEnvioPorDefectoPorcentaje:
        costoEnvioPorDefectoPorcentaje !== '' ? parseFloat(costoEnvioPorDefectoPorcentaje) : null,
      descuentosPorDefecto: descuentosPorDefecto.map((d) => ({
        nombre: d.nombre.trim(),
        porcentaje: parseFloat(d.porcentaje),
      })),
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const tabClass = (key) =>
    `flex-1 py-2.5 text-sm font-semibold rounded-base transition-colors cursor-pointer ${
      seccion === key ? 'bg-paper text-accent-ink' : 'text-muted hover:text-body'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-none sm:rounded-panel border border-line-strong w-full h-full sm:h-auto max-w-lg flex flex-col max-h-screen sm:max-h-[95vh]">
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-canvas transition-colors text-faint hover:text-body cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-none flex gap-1 p-1.5 mx-6 mt-4 bg-canvas rounded-base">
            <button type="button" onClick={() => setSeccion('datos')} className={tabClass('datos')}>
              Datos
            </button>
            <button type="button" onClick={() => setSeccion('costeo')} className={tabClass('costeo')}>
              Costeo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {seccion === 'datos' && (
              <>
                <div>
                  <label htmlFor="nombre" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all ${
                      errors.nombre ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                    }`}
                    placeholder="Ej: Distribuidora Ferretera SA"
                  />
                  {errors.nombre && <p className="mt-1 text-xs text-danger font-medium">{errors.nombre}</p>}
                </div>

                <div>
                  <label htmlFor="contacto" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Persona de contacto (opcional)
                  </label>
                  <input
                    id="contacto"
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-base border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                    placeholder="Ej: Marcelo"
                  />
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    id="telefono"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-base border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                    placeholder="Ej: 341 1234567"
                  />
                </div>
              </>
            )}

            {seccion === 'costeo' && (
              <>
                <div className="bg-canvas border border-line rounded-base p-4 space-y-3">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                    Tratamiento del IVA
                  </label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ivaIncluido"
                        checked={ivaIncluidoEnPrecio}
                        onChange={() => setIvaIncluidoEnPrecio(true)}
                        className="mt-0.5 cursor-pointer accent-accent"
                      />
                      <span className="text-sm text-body">
                        <strong>IVA incluido en el precio</strong>
                        <br />
                        <span className="text-xs text-muted">El precio de lista ya trae el IVA (se guarda 0% explícito en cada producto).</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ivaIncluido"
                        checked={!ivaIncluidoEnPrecio}
                        onChange={() => setIvaIncluidoEnPrecio(false)}
                        className="mt-0.5 cursor-pointer accent-accent"
                      />
                      <span className="text-sm text-body">
                        <strong>IVA aparte</strong>
                        <br />
                        <span className="text-xs text-muted">El IVA se suma aparte del precio de lista.</span>
                      </span>
                    </label>
                  </div>

                  {!ivaIncluidoEnPrecio && (
                    <div>
                      <label htmlFor="ivaPorDefecto" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                        IVA por defecto (%)
                      </label>
                      <FormattedNumberInput
                        id="ivaPorDefecto"
                        value={ivaPorDefectoPorcentaje}
                        onChange={setIvaPorDefectoPorcentaje}
                        className={`w-full px-4 py-2 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all font-mono tabular-nums ${
                          errors.iva ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                        }`}
                        placeholder="Ej: 21"
                      />
                      <p className="mt-1 text-xs text-faint">Sólo comodidad de tipeo: editable producto por producto, no gobierna ningún cálculo.</p>
                      {errors.iva && <p className="mt-1 text-xs text-danger font-medium">{errors.iva}</p>}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-canvas border border-line rounded-base p-4">
                  <input
                    type="checkbox"
                    checked={manejaDolares}
                    onChange={(e) => setManejaDolares(e.target.checked)}
                    className="w-4 h-4 cursor-pointer accent-accent"
                  />
                  <span className="text-sm text-body">
                    <strong>Maneja dólares</strong>
                    <br />
                    <span className="text-xs text-muted">Este proveedor cotiza algunos de sus productos en USD (no implica que todos lo estén).</span>
                  </span>
                </label>

                <div>
                  <label htmlFor="envioPorDefecto" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Envío por defecto (%)
                  </label>
                  <FormattedNumberInput
                    id="envioPorDefecto"
                    value={costoEnvioPorDefectoPorcentaje}
                    onChange={setCostoEnvioPorDefectoPorcentaje}
                    className={`w-full px-4 py-2 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all font-mono tabular-nums ${
                      errors.envio ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                    }`}
                    placeholder="Ej: 5"
                  />
                  <p className="mt-1 text-xs text-faint">Siempre como porcentaje del costo neto; no admite un monto fijo.</p>
                  {errors.envio && <p className="mt-1 text-xs text-danger font-medium">{errors.envio}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                      Descuentos por defecto
                    </label>
                    <button
                      type="button"
                      onClick={handleAddDescuento}
                      className="flex items-center gap-1 text-xs font-semibold text-accent-ink hover:brightness-90 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar descuento
                    </button>
                  </div>

                  {descuentosPorDefecto.length === 0 && (
                    <p className="text-xs text-faint italic mb-2">Sin descuentos cargados.</p>
                  )}

                  <div className="space-y-2">
                    {descuentosPorDefecto.map((d, index) => {
                      const mult = multiplicadorDescuento(d.porcentaje);
                      return (
                        <div key={index}>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={d.nombre}
                              onChange={(e) => handleDescuentoNombreChange(index, e.target.value)}
                              placeholder="Ej: Descuento 1"
                              className="flex-1 min-w-0 px-3 py-2 rounded-base border border-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                            />
                            <div className="w-16 shrink-0">
                              <FormattedNumberInput
                                value={d.porcentaje}
                                onChange={(val) => handleDescuentoPorcentajeChange(index, val)}
                                placeholder="%"
                                className="w-full px-2 py-2 rounded-base border border-line bg-paper text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDescuento(index)}
                              className="p-2 rounded-base text-danger hover:bg-danger-bg transition-colors cursor-pointer shrink-0"
                              aria-label="Quitar descuento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {mult !== null && (
                            <p className="pl-1 mt-0.5 text-[11px] text-faint">= × {mult}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {errors.descuentos && (
                    <p className="mt-2 text-xs text-danger font-medium">{errors.descuentos}</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex-none flex items-center justify-end gap-3 p-4 px-6 border-t border-line bg-canvas/50 sm:rounded-b-panel">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-base border border-line text-sm font-medium text-body hover:bg-canvas transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-base bg-accent hover:brightness-95 text-sm font-semibold text-paper transition-all cursor-pointer"
            >
              {proveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProveedorForm;
