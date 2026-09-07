import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Truck, Download, ScanBarcode } from 'lucide-react';
import FormattedNumberInput from './FormattedNumberInput';
import EscanerCodigoBarra from './EscanerCodigoBarra';
import CodigoBarraDuplicadoModal from './CodigoBarraDuplicadoModal';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useQuery } from '@tanstack/react-query';
import { negociosApi } from '../api/negocios.api';
import { proveedoresApi } from '../api/proveedores.api';
import { productosApi } from '../api/productos.api';
import { calcularCosto, resolverEfectivo } from '../utils/costeo';
import { verificarCodigoBarraDuplicado } from '../utils/verificarCodigoBarraDuplicado';
import { getErrorMessage } from '../utils/errorMessage';

// Equivalencia porcentaje ↔ multiplicador (OQ8/Decisión 11), mismo helper que ProveedorForm.jsx
// (tarea 4.4, replicado acá en la 8.9): sólo texto de ayuda, el valor guardado sigue siendo el
// porcentaje.
const multiplicadorDescuento = (porcentajeVal) => {
  if (porcentajeVal === '' || porcentajeVal === null || porcentajeVal === undefined) return null;
  const p = parseFloat(porcentajeVal);
  if (Number.isNaN(p)) return null;
  return (1 - p / 100).toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

// codigoBarraInicial (tarea 8.6): permite precargar el campo en un ALTA disparada desde el
// resultado "no encontrado" del escaneo de búsqueda (tarea 9.5) — el vendedor escaneó un envase
// que no matcheó ningún producto y decide cargarlo con ese mismo código ya puesto.
const ProductoForm = ({ producto, onSave, onCancel, isOpen, codigoBarraInicial }) => {
  const { unidadNegocioActiva } = useAuthStore();
  const { askConfirm, pushToast } = useUIStore();

  const { data: negocios } = useQuery({
    queryKey: ['negocios'],
    queryFn: () => negociosApi.getAll(),
    enabled: isOpen,
  });

  const activeUnit = negocios?.find(n => n.id.toString() === unidadNegocioActiva);
  const costoEnvioDefault = activeUnit?.costoEnvioPorcentaje ?? 0;
  const ivaDefault = activeUnit?.ivaPorcentaje ?? 0;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [costoProducto, setCostoProducto] = useState('');
  const [porcentajeGanancia, setPorcentajeGanancia] = useState('');
  // Lista libre de descuentos ESTABLES del producto (Decisión 1 de design.md de
  // costeo-flexible-por-producto), reemplaza el input único "Desc. Prov (%)" (tarea 9.3).
  const [descuentos, setDescuentos] = useState([]);
  // IVA y envío propios del producto: opcionales, '' significa "hereda el default de la unidad
  // de negocio" (Decisión 5) — nunca se guarda como 0 por defecto.
  const [ivaPropio, setIvaPropio] = useState('');
  const [envioPropio, setEnvioPropio] = useState('');
  const [stock, setStock] = useState('');
  const [lote, setLote] = useState('');
  const [dueno, setDueno] = useState('');
  // Proveedor elegido en el <select> que reemplaza al de marca (tarea 8.1, conectado de punta a
  // punta en el grupo 9): dispara la copia de valores por defecto al formulario (una sola vez,
  // OQ3) Y es el vínculo de catálogo real que viaja en el payload como proveedorId
  // (Producto.proveedor/ProductoDTO.proveedorId, agregados en el grupo 9). `marca`/`marcaId`
  // dejaron de enviarse desde este formulario: quedan como red de rollback sólo en el backend.
  const [proveedorSeleccionadoId, setProveedorSeleccionadoId] = useState('');
  // Moneda en que el proveedor cotiza el costo de este producto (grupo 5/8): 'ARS' por defecto,
  // sin valor ambiguo — mismo criterio que el backend (Producto.monedaCosto).
  const [monedaCosto, setMonedaCosto] = useState('ARS');
  const [errors, setErrors] = useState({});
  // Precio que el producto tenía ANTES de abrir el formulario (snapshot al abrir), para poder
  // avisar en el submit si el precio calculado se movió respecto de este valor (fix del
  // 2026-08-26, pedido directo del usuario). null en alta (no hay "antes" con qué comparar).
  const [precioOriginal, setPrecioOriginal] = useState(null);

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => proveedoresApi.getAll(),
    enabled: isOpen && unidadNegocioActiva === '2',
  });

  const { data: categoriasAbono = [] } = useQuery({
    queryKey: ['categorias-abono'],
    queryFn: async () => {
      const { getAllCategoriasAbono } = await import('../api/categoriaAbono.api');
      const res = await getAllCategoriasAbono();
      return res.data;
    },
    enabled: isOpen && unidadNegocioActiva === '3',
  });

  const [categoriaAbonoId, setCategoriaAbonoId] = useState('');

  // Código de barras de fábrica — sólo Herramientas (unidadNegocioActiva === '2'). Escaneo NO
  // persiste solo (Decisión 4 de design.md): sólo llena este estado, el guardado sigue siendo el
  // submit normal del formulario. Editable a mano (tarea 8.4) para cuando la cámara no coopera.
  const [codigoBarra, setCodigoBarra] = useState('');
  const [escanerAbierto, setEscanerAbierto] = useState(false);
  // Grupo 13 (aviso de código duplicado al escanear, extensión post-cierre): { codigo, producto }
  // del conflicto detectado apenas se escanea — null cuando no hay ningún conflicto abierto.
  const [conflictoCodigoBarra, setConflictoCodigoBarra] = useState(null);
  // Bug real reportado por el usuario: liberar el código de inmediato al elegir "Quedarme con
  // este código" (antes de guardar) dejaba el código sin dueño si el formulario se cerraba sin
  // guardar — el producto viejo ya lo había perdido, pero el nuevo nunca llegó a recibirlo.
  // Ahora sólo se recuerda la intención acá; el DELETE real recién se dispara en guardar(),
  // justo antes del submit — si nunca se guarda, nunca se libera nada.
  const [codigoALiberarAlGuardar, setCodigoALiberarAlGuardar] = useState(null);

  useEffect(() => {
    if (producto) {
      setNombre(producto.nombre || '');
      setDescripcion(producto.descripcion || '');
      setPrecio(producto.precio || '');
      setCostoProducto(producto.costoProducto || '');
      setPorcentajeGanancia(producto.porcentajeGanancia || '');
      setDescuentos(
        producto.descuentos && producto.descuentos.length > 0
          ? producto.descuentos.map(d => ({ nombre: d.nombre || '', porcentaje: d.porcentaje ?? '' }))
          : []
      );
      setIvaPropio(producto.ivaPorcentaje !== null && producto.ivaPorcentaje !== undefined ? String(producto.ivaPorcentaje) : '');
      setEnvioPropio(producto.costoEnvioPorcentaje !== null && producto.costoEnvioPorcentaje !== undefined ? String(producto.costoEnvioPorcentaje) : '');
      setStock(producto.stock || '');
      setLote(producto.lote || '');
      setDueno(producto.dueno || '');
      setMonedaCosto(producto.monedaCosto || 'ARS');
      // Producto.proveedor ya existe (grupo 9): el select nace mostrando el proveedor
      // efectivamente vinculado, sin disparar la copia de valores (eso sólo pasa vía
      // handleProveedorChange, ante una elección explícita del usuario — tarea 8.3).
      setProveedorSeleccionadoId(producto.proveedorId ? producto.proveedorId.toString() : '');
      setCategoriaAbonoId(producto.categoriaAbonoId ? producto.categoriaAbonoId.toString() : '');
      // Snapshot del precio "de antes" para la confirmación del submit — nunca se vuelve a
      // recalcular durante la edición, sólo se lee al comparar en handleSubmit.
      setPrecioOriginal(producto.precio !== null && producto.precio !== undefined ? Number(producto.precio) : null);
      setCodigoBarra(producto.codigoBarra || '');
      setCodigoALiberarAlGuardar(null);
    } else {
      setCodigoALiberarAlGuardar(null);
      setNombre('');
      setDescripcion('');
      setPrecio('');
      setCostoProducto('');
      // Problema 4 de la tanda de fixes del 2026-08-20 (pedido explícito del usuario, para TODOS
      // los productos, Vivero y Herramientas): un producto NUEVO nace con 30% de ganancia
      // precargado en vez de vacío, para que el precio salga bien calculado desde el arranque.
      // Sólo en alta — un producto EXISTENTE (rama `if (producto)` de arriba) conserva su propio
      // valor real tal cual venga de la base, nunca se le pisa nada acá.
      setPorcentajeGanancia('30');
      setDescuentos([]);
      setIvaPropio('');
      setEnvioPropio('');
      setStock('');
      setLote('');
      setDueno('');
      setMonedaCosto('ARS');
      setProveedorSeleccionadoId('');
      setCategoriaAbonoId('');
      setPrecioOriginal(null);
      // Alta: precarga el código sólo si viene del flujo "no encontrado" (tarea 8.6/9.5); si no,
      // vacío — igual que el resto de los campos opcionales en un alta normal.
      setCodigoBarra(codigoBarraInicial || '');
    }
    setErrors({});
  }, [producto, isOpen, codigoBarraInicial]);

  const calcCostoFinal = (costo, descuentosList, ivaPropioVal, envioPropioVal) => {
    const cBase = costo ? parseFloat(costo) : 0;
    const porcentajes = (descuentosList || [])
      .map((d) => (d.porcentaje !== '' && d.porcentaje !== null && d.porcentaje !== undefined ? parseFloat(d.porcentaje) : NaN))
      .filter((p) => !Number.isNaN(p));
    const ivaEfectivo = resolverEfectivo(ivaPropioVal, ivaDefault);
    const envioEfectivo = resolverEfectivo(envioPropioVal, costoEnvioDefault);
    return calcularCosto(cBase, porcentajes, ivaEfectivo, envioEfectivo).costoFinal;
  };

  const recalcPrecio = (costo, descuentosList, ivaPropioVal, envioPropioVal, ganancia) => {
    const cf = calcCostoFinal(costo, descuentosList, ivaPropioVal, envioPropioVal);
    const pGan = ganancia ? parseFloat(ganancia) : 0;
    if (cf > 0) {
      const ganMonto = (cf * pGan) / 100;
      setPrecio((cf + ganMonto).toFixed(2));
    }
  };

  const recalcGanancia = (costo, descuentosList, ivaPropioVal, envioPropioVal, prec) => {
    const cf = calcCostoFinal(costo, descuentosList, ivaPropioVal, envioPropioVal);
    const pr = prec ? parseFloat(prec) : 0;
    if (cf > 0) {
      const pGan = ((pr - cf) / cf) * 100;
      setPorcentajeGanancia(pGan.toFixed(2));
    } else {
      setPorcentajeGanancia('');
    }
  };

  const handleCostoChange = (val) => {
    setCostoProducto(val);
    recalcPrecio(val, descuentos, ivaPropio, envioPropio, porcentajeGanancia);
  };

  const handleGananciaChange = (val) => {
    setPorcentajeGanancia(val);
    recalcPrecio(costoProducto, descuentos, ivaPropio, envioPropio, val);
  };

  const handlePrecioChange = (val) => {
    setPrecio(val);
    recalcGanancia(costoProducto, descuentos, ivaPropio, envioPropio, val);
  };

  const handleIvaPropioChange = (val) => {
    setIvaPropio(val);
    recalcPrecio(costoProducto, descuentos, val, envioPropio, porcentajeGanancia);
  };

  const handleEnvioPropioChange = (val) => {
    setEnvioPropio(val);
    recalcPrecio(costoProducto, descuentos, ivaPropio, val, porcentajeGanancia);
  };

  const handleDescuentoNombreChange = (index, val) => {
    const next = descuentos.map((d, i) => (i === index ? { ...d, nombre: val } : d));
    setDescuentos(next);
  };

  const handleDescuentoPorcentajeChange = (index, val) => {
    const next = descuentos.map((d, i) => (i === index ? { ...d, porcentaje: val } : d));
    setDescuentos(next);
    recalcPrecio(costoProducto, next, ivaPropio, envioPropio, porcentajeGanancia);
  };

  const handleAddDescuento = () => {
    setDescuentos([...descuentos, { nombre: '', porcentaje: '' }]);
  };

  const handleRemoveDescuento = (index) => {
    const next = descuentos.filter((_, i) => i !== index);
    setDescuentos(next);
    recalcPrecio(costoProducto, next, ivaPropio, envioPropio, porcentajeGanancia);
  };

  // Copia visible del perfil de costeo del proveedor a los campos del formulario (grupo 8, tarea
  // 8.1/8.2): SIEMPRE de una sola vez (OQ3) — de acá en más los campos son completamente
  // independientes, el backend no vuelve a consultar al proveedor. Con IVA incluido se escribe
  // '0' explícito (nunca vacío/null — tarea 8.2), porque vacío heredaría el 21% de la unidad.
  const aplicarPerfilProveedor = (proveedor) => {
    const ivaVal = proveedor.ivaIncluidoEnPrecio
      ? '0'
      : (proveedor.ivaPorDefectoPorcentaje !== null && proveedor.ivaPorDefectoPorcentaje !== undefined
          ? String(proveedor.ivaPorDefectoPorcentaje) : '');
    const envioVal = proveedor.costoEnvioPorDefectoPorcentaje !== null && proveedor.costoEnvioPorDefectoPorcentaje !== undefined
      ? String(proveedor.costoEnvioPorDefectoPorcentaje) : '';
    const nuevosDescuentos = (proveedor.descuentosPorDefecto || []).map((d) => ({
      nombre: d.nombre || '',
      porcentaje: d.porcentaje ?? '',
    }));
    const nuevaMoneda = proveedor.manejaDolares ? 'USD' : 'ARS';

    setIvaPropio(ivaVal);
    setEnvioPropio(envioVal);
    setDescuentos(nuevosDescuentos);
    setMonedaCosto(nuevaMoneda);
    recalcPrecio(
      costoProducto,
      nuevosDescuentos,
      ivaVal,
      envioVal,
      porcentajeGanancia,
    );
  };

  // Fix del 2026-08-26 (pedido directo del usuario): elegir un proveedor en el <select> es sólo
  // navegación — NUNCA pisa los campos de descuentos/IVA/envío/moneda del producto por su cuenta,
  // ni siquiera con confirmación. Copiar los defaults del proveedor pasa a ser una acción
  // deliberada y separada: el botón "Aplicar valores por defecto de {proveedor}" de más abajo,
  // que llama a aplicarPerfilProveedor() directamente al click.
  const handleProveedorChange = (e) => {
    setProveedorSeleccionadoId(e.target.value);
  };

  const proveedorSeleccionado = proveedores.find((p) => String(p.id) === proveedorSeleccionadoId);

  // Desglose en vivo (tarea 9.6): una línea por descuento (cascada, en el orden cargado), línea
  // de IVA, línea de envío, costo final y precio de venta — todo desde el mismo utilitario que
  // arma el payload, para que la UI nunca pueda mostrar un número distinto del que se guarda.
  const cBase = costoProducto ? parseFloat(costoProducto) : 0;
  const pVenta = precio ? parseFloat(precio) : 0;
  const ivaEfectivo = resolverEfectivo(ivaPropio, ivaDefault);
  const envioEfectivo = resolverEfectivo(envioPropio, costoEnvioDefault);

  const porcentajesDescuento = descuentos
    .map((d) => (d.porcentaje !== '' && d.porcentaje !== null && d.porcentaje !== undefined ? parseFloat(d.porcentaje) : NaN))
    .filter((p) => !Number.isNaN(p));

  // Monto de cada fila para el desglose visual: en vez de reimplementar la cascada a mano acá
  // (que sería una quinta copia de la fórmula), se lee como la diferencia entre lo que da
  // calcularCosto() aplicando los descuentos de a uno más en cada paso — el único lugar que
  // multiplica porcentajes sigue siendo costeo.js.
  const prefijoPorcentaje = (hastaIndex) =>
    descuentos.slice(0, hastaIndex).map((x) => (x.porcentaje !== '' && x.porcentaje !== null && x.porcentaje !== undefined ? parseFloat(x.porcentaje) : NaN));

  let netoPrevio = cBase;
  const filasDescuento = descuentos.map((d, index) => {
    const perc = d.porcentaje !== '' && d.porcentaje !== null && d.porcentaje !== undefined ? parseFloat(d.porcentaje) : NaN;
    if (Number.isNaN(perc)) {
      return { nombre: d.nombre, porcentaje: 0, monto: 0 };
    }
    const netoHastaAca = calcularCosto(cBase, prefijoPorcentaje(index + 1), 0, 0).netoConDescuentos;
    const monto = netoPrevio - netoHastaAca;
    netoPrevio = netoHastaAca;
    return { nombre: d.nombre, porcentaje: perc, monto };
  });

  const desglose = calcularCosto(cBase, porcentajesDescuento, ivaEfectivo, envioEfectivo);
  const costoFinalCalc = desglose.costoFinal;
  const gananciaMonto = pVenta - costoFinalCalc;

  const isVivero = unidadNegocioActiva === '1';
  const isAbono = unidadNegocioActiva === '3';
  
  const tituloModal = producto
    ? (isVivero ? 'Editar Producto (Planta)' : (isAbono ? 'Editar Producto (Abono)' : 'Editar Producto'))
    : (isVivero ? 'Nuevo Producto (Planta)' : (isAbono ? 'Nuevo Producto (Abono)' : 'Nuevo Producto'));
    
  const labelNombre = isVivero ? 'Nombre de la Planta' : (isAbono ? 'Nombre del Abono' : 'Nombre del Producto');
  
  const placeholderNombre = isVivero 
    ? 'Ej: Lechuga morada, Repollo, Acelga' 
    : (isAbono ? 'Ej: Tierra Fértil 50L, Humus de Lombriz' : 'Ej: Pala ancha, Maceta, Fertilizante');

  const validate = () => {
    const newErrors = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!precio) {
      newErrors.precio = 'El precio es requerido';
    } else if (parseFloat(precio) <= 0) {
      newErrors.precio = 'El precio debe ser mayor a 0';
    }
    if (!isAbono) {
      if (stock === '' || stock === null) {
        newErrors.stock = 'El stock es requerido';
      } else if (parseInt(stock, 10) < 0) {
        newErrors.stock = 'El stock no puede ser negativo';
      }
    }
    // Validación de la lista de descuentos (tarea 9.7): nombre no vacío, porcentaje no negativo.
    // No se manda la petición si alguna fila es inválida.
    const nombreFaltante = descuentos.some((d) => !d.nombre || !d.nombre.trim());
    const porcentajeInvalido = descuentos.some((d) => {
      const p = d.porcentaje === '' || d.porcentaje === null || d.porcentaje === undefined ? NaN : parseFloat(d.porcentaje);
      return Number.isNaN(p) || p < 0;
    });
    if (nombreFaltante) {
      newErrors.descuentos = 'Cada descuento debe tener un nombre.';
    } else if (porcentajeInvalido) {
      newErrors.descuentos = 'El porcentaje de cada descuento debe ser un número mayor o igual a 0.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const guardar = async () => {
    // Si se eligió "Quedarme con este código" en algún momento de esta edición, recién ACÁ se
    // libera de verdad del producto que lo tenía — justo antes del submit real, nunca antes.
    // Si falla, se corta acá: no se manda el guardado con un código que puede seguir en conflicto.
    if (codigoALiberarAlGuardar) {
      try {
        await productosApi.liberarCodigoBarra(codigoALiberarAlGuardar);
      } catch (err) {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al liberar el código de barras del producto anterior. No se guardó.'));
        return;
      }
    }
    onSave({
      nombre,
      descripcion,
      precio: parseFloat(precio),
      costoProducto: costoProducto ? parseFloat(costoProducto) : null,
      porcentajeGanancia: porcentajeGanancia ? parseFloat(porcentajeGanancia) : null,
      // Este formulario ya no edita descuentoProveedor directamente (Decisión 8: la columna
      // queda intacta como red de rollback, pero deja de leerse/escribirse desde acá). La
      // lista de descuentos es la fuente de verdad nueva; no enviarlo deja el valor migrado
      // sin tocar en el backend (actualizarProducto sólo lo pisa si el DTO trae un valor).
      descuentos: descuentos.map((d) => ({ nombre: d.nombre.trim(), porcentaje: parseFloat(d.porcentaje) })),
      // '' -> null (no 0): un campo vacío significa "hereda el default de la unidad de
      // negocio" (Decisión 5), mismo patrón que ya usa este componente para costoProducto.
      ivaPorcentaje: ivaPropio !== '' ? parseFloat(ivaPropio) : null,
      costoEnvioPorcentaje: envioPropio !== '' ? parseFloat(envioPropio) : null,
      stock: isAbono ? 0 : parseInt(stock, 10),
      lote: lote.trim() || null,
      dueno: dueno.trim() || null,
      // Vínculo de catálogo real (grupo 9): reemplaza a marcaId, que este formulario ya no
      // envía. '' (sin proveedor elegido) -> null, igual criterio que el resto de los campos
      // opcionales de este formulario.
      proveedorId: proveedorSeleccionadoId ? parseInt(proveedorSeleccionadoId, 10) : null,
      // Moneda de costeo del producto (grupo 5/8): siempre viaja informada (nunca null), igual
      // criterio que el resto de los campos de costeo de este formulario.
      monedaCosto,
      categoriaAbonoId: categoriaAbonoId ? parseInt(categoriaAbonoId, 10) : null,
      // Código de barras (tarea 8.5): sólo viaja en Herramientas, igual que el resto de los
      // campos exclusivos de esa unidad en este payload (costoProducto, ivaPorcentaje...).
      // Normalización final (trim / vacío -> null) la hace el backend (Decisión 3); acá sólo se
      // evita mandar un string vacío en vez de null.
      ...(unidadNegocioActiva === '2' ? { codigoBarra: codigoBarra.trim() || null } : {}),
    });
  };

  const formatearMonto = (n) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Fix del 2026-08-26 (pedido directo del usuario): si el precio de venta CALCULADO (el que
    // se va a persistir) es distinto del que el producto tenía al abrir el formulario, se pide
    // confirmación explícita antes de guardar — vía askConfirm, nunca confirm() nativo. Alta de
    // producto (precioOriginal === null) o ediciones que no mueven el precio guardan directo,
    // sin fricción.
    const precioNuevo = parseFloat(precio);
    const huboCambioDePrecio =
      producto &&
      precioOriginal !== null &&
      !Number.isNaN(precioNuevo) &&
      Math.round(precioNuevo * 100) !== Math.round(precioOriginal * 100);

    if (huboCambioDePrecio) {
      askConfirm({
        title: 'Confirmar cambio de precio',
        message: `El precio de venta va a pasar de $${formatearMonto(precioOriginal)} a $${formatearMonto(precioNuevo)}. ¿Confirmás guardar los cambios?`,
        variant: 'warning',
        confirmLabel: 'Guardar cambios',
        onConfirm: guardar,
      });
      return;
    }

    guardar();
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Grupo 13 (aviso de código duplicado al escanear): reemplaza el onDetectado directo de
  // EscanerCodigoBarra — antes de escribir el código en el campo, chequea si ya está asignado a
  // OTRO producto. En alta (producto == null) cualquier resultado encontrado es un conflicto; en
  // edición, "soy el mismo producto" (mismo id) no es un conflicto real — se escribe directo,
  // igual que si no se hubiera encontrado nada (404).
  const handleCodigoEscaneado = async (codigo) => {
    try {
      const encontrado = await verificarCodigoBarraDuplicado(codigo);
      const esElMismoProducto = producto && encontrado && encontrado.id === producto.id;
      if (encontrado && !esElMismoProducto) {
        setConflictoCodigoBarra({ codigo, producto: encontrado });
        return;
      }
      setCodigoBarra(codigo);
    } catch (err) {
      pushToast('error', getErrorMessage(err, 'Ocurrió un error al verificar el código de barras.'));
    }
  };

  // "Descartar código nuevo": cierra el aviso, no toca el campo — el código escaneado se pierde.
  const handleDescartarCodigoDuplicado = () => {
    setConflictoCodigoBarra(null);
  };

  // "Quedarme con este código": NO libera nada todavía (bug corregido, ver el comentario de
  // codigoALiberarAlGuardar) — sólo escribe el código en el campo y recuerda que hay que
  // liberarlo del producto viejo cuando se guarde de verdad. Si el usuario cierra el formulario
  // sin guardar, el producto viejo se queda con su código intacto.
  const handleQuedarmeConCodigoDuplicado = () => {
    if (!conflictoCodigoBarra) return;
    setCodigoBarra(conflictoCodigoBarra.codigo);
    setCodigoALiberarAlGuardar(conflictoCodigoBarra.codigo);
    setConflictoCodigoBarra(null);
  };

  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm transition-all duration-300 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="bg-paper rounded-none sm:rounded-panel border border-line-strong w-full h-full sm:h-auto max-w-2xl flex flex-col max-h-screen sm:max-h-[95vh] scale-100 transition-transform duration-300 animate-scaleIn">

        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">
            {tituloModal}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-canvas transition-colors text-faint hover:text-body cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto">
            <div>
            <label htmlFor="nombre" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              {labelNombre}
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all ${
                errors.nombre ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
              }`}
              placeholder={placeholderNombre}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-danger font-medium">{errors.nombre}</p>
            )}
          </div>

          {unidadNegocioActiva === '3' && (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Categoría
              </label>
              <div className="relative">
                <select
                  value={categoriaAbonoId}
                  onChange={(e) => setCategoriaAbonoId(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-base border border-line bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all appearance-none cursor-pointer"
                >
                  <option value="">Seleccione una categoría...</option>
                  {categoriasAbono.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="descripcion" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows="3"
              className="w-full px-4 py-2.5 rounded-base border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all resize-none"
              placeholder="Detalles sobre cuidados, tamaño, riego..."
            />
          </div>

          {/* Código de barras de fábrica — sólo Herramientas (tarea 8.2, condicionado a
              unidadNegocioActiva === '2', mismo patrón que el resto de los bloques
              condicionales de este formulario). */}
          {unidadNegocioActiva === '2' && (
            <div>
              <label htmlFor="codigoBarra" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Código de barras (Opcional)
              </label>
              <div className="flex gap-2">
                <input
                  id="codigoBarra"
                  type="text"
                  value={codigoBarra}
                  onChange={(e) => setCodigoBarra(e.target.value)}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-base border border-line bg-paper focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all font-mono tabular-nums"
                  placeholder="Ej: 7791234567890"
                />
                <button
                  type="button"
                  onClick={() => setEscanerAbierto(true)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-base border border-line text-body hover:bg-canvas transition-colors cursor-pointer"
                  title="Escanear código de barras"
                >
                  <ScanBarcode className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">Escanear</span>
                </button>
              </div>
              <p className="mt-1 text-[11px] text-faint">
                Escaneá el envase o tipeá el código a mano. No se guarda hasta que confirmes el formulario.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {unidadNegocioActiva !== '2' && (
              <div>
                <label htmlFor="precio" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Precio de Venta (ARS)
                </label>
                <FormattedNumberInput
                  id="precio"
                  value={precio}
                  onChange={(val) => setPrecio(val)}
                  decimales={0}
                  className={`w-full px-4 py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all font-mono tabular-nums ${
                    errors.precio ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                  }`}
                  placeholder="0"
                />
                {errors.precio && (
                  <p className="mt-1 text-xs text-danger font-medium">{errors.precio}</p>
                )}
              </div>
            )}

            {unidadNegocioActiva !== '3' && (
              <div className={unidadNegocioActiva === '2' ? 'col-span-1' : 'col-span-2'}>
                <label htmlFor="stock" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Stock (Unidades)
                </label>
                <FormattedNumberInput
                  id="stock"
                  value={stock}
                  onChange={(val) => setStock(val)}
                  className={`w-full px-4 py-2.5 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all font-mono tabular-nums ${
                    errors.stock ? 'border-danger-line focus:ring-danger' : 'border-line focus:border-accent'
                  }`}
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="mt-1 text-xs text-danger font-medium">{errors.stock}</p>
                )}
              </div>
            )}

            {unidadNegocioActiva === '2' && (
              <div className="col-span-1">
                <label htmlFor="proveedorId" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Truck className="w-3 h-3 text-accent" />
                  Proveedor (Opcional)
                </label>
                <select
                  id="proveedorId"
                  value={proveedorSeleccionadoId}
                  onChange={handleProveedorChange}
                  className="w-full px-4 py-2.5 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all bg-paper"
                >
                  <option value="">-- Sin proveedor --</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-faint">
                  Elegirlo NO modifica los valores cargados abajo. Usá el botón "Aplicar valores por defecto" para traerlos.
                </p>
              </div>
            )}

            {unidadNegocioActiva === '2' && (
              <div className="col-span-2 mt-2 bg-canvas border border-line rounded-base p-4">
                {proveedorSeleccionado && (
                  <button
                    type="button"
                    onClick={() => aplicarPerfilProveedor(proveedorSeleccionado)}
                    className="flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-base text-xs font-semibold text-accent-ink bg-accent-soft hover:brightness-95 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Aplicar valores por defecto de {proveedorSeleccionado.nombre}
                  </button>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label htmlFor="costoProducto" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                      Costo Catálogo
                    </label>
                    <FormattedNumberInput
                      id="costoProducto"
                      value={costoProducto}
                      onChange={handleCostoChange}
                      decimales={0}
                      className="w-full px-4 py-2 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all border-line focus:border-accent font-mono tabular-nums"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label htmlFor="ivaPropio" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                      IVA propio (%)
                    </label>
                    <FormattedNumberInput
                      id="ivaPropio"
                      // El estado ivaPropio sigue siendo la fuente de verdad para el submit
                      // ('' = hereda -> null). Lo que se MUESTRA en el input, en cambio, es el
                      // default de la unidad cuando no hay override, para que el campo se vea
                      // "pre-cargado" con ese número en vez de un placeholder gris. Al tipear,
                      // FormattedNumberInput dispara onChange con el valor tipeado y ivaPropio
                      // deja de ser '', quedando como override real (aunque el número coincida
                      // con el default).
                      value={ivaPropio !== '' ? ivaPropio : ivaDefault}
                      onChange={handleIvaPropioChange}
                      className="w-full px-4 py-2 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all border-line focus:border-accent font-mono tabular-nums"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label htmlFor="envioPropio" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                      Envío propio (%)
                    </label>
                    <FormattedNumberInput
                      id="envioPropio"
                      // Mismo patrón que ivaPropio: el valor mostrado cae al default de envío
                      // de la unidad cuando envioPropio === '' (hereda), sin tocar el estado que
                      // decide qué se manda en el submit.
                      value={envioPropio !== '' ? envioPropio : costoEnvioDefault}
                      onChange={handleEnvioPropioChange}
                      className="w-full px-4 py-2 rounded-base border bg-paper focus:outline-none focus:ring-2 focus:ring-accent transition-all border-line focus:border-accent font-mono tabular-nums"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label htmlFor="porcentajeGanancia" className="block text-xs font-bold text-accent-ink uppercase tracking-wider mb-1">
                      % Ganancia
                    </label>
                    <FormattedNumberInput
                      id="porcentajeGanancia"
                      value={porcentajeGanancia}
                      onChange={handleGananciaChange}
                      className="w-full px-4 py-2 rounded-base border-2 bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent transition-all border-accent focus:border-accent text-accent-ink font-bold text-center font-mono tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Moneda del costo de catálogo (grupo 5/8): ARS por defecto, editable siempre —
                    seleccionar un proveedor que maneja dólares la sugiere en USD (tarea 8.1),
                    pero queda libre para corregir producto por producto. */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                    Moneda del costo de catálogo
                  </label>
                  <div className="flex gap-2">
                    {['ARS', 'USD'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMonedaCosto(m)}
                        className={`px-4 py-1.5 rounded-base text-sm font-semibold border cursor-pointer transition-colors ${
                          monedaCosto === m
                            ? 'bg-accent border-accent text-paper'
                            : 'bg-paper border-line text-body hover:border-accent'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wider">
                    Descuentos estables (Proveedor, Volumen, Pronto pago...)
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

                {descuentos.length === 0 && (
                  <p className="text-xs text-faint italic mb-2">Sin descuentos cargados.</p>
                )}

                <div className="space-y-2 mb-3">
                  {descuentos.map((d, index) => {
                    const mult = multiplicadorDescuento(d.porcentaje);
                    return (
                    <div key={index}>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={d.nombre}
                          onChange={(e) => handleDescuentoNombreChange(index, e.target.value)}
                          placeholder="Ej: Proveedor, Volumen, Pronto pago"
                          className="flex-1 min-w-0 px-3 py-2 rounded-base border border-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        />
                        <div className="w-24 shrink-0">
                          <FormattedNumberInput
                            value={d.porcentaje}
                            onChange={(val) => handleDescuentoPorcentajeChange(index, val)}
                            placeholder="%"
                            className="w-full px-3 py-2 rounded-base border border-line bg-paper text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all font-mono tabular-nums"
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
                        <p className="pl-1 mt-0.5 text-[11px] text-faint font-mono tabular-nums">= × {mult}</p>
                      )}
                    </div>
                    );
                  })}
                </div>
                {errors.descuentos && (
                  <p className="mb-3 text-xs text-danger font-medium">{errors.descuentos}</p>
                )}

                <div className="bg-paper border border-line rounded-base p-3 text-sm text-body space-y-2">
                  {filasDescuento.map((f, index) => (
                    <div key={index} className="flex justify-between items-center text-muted gap-2">
                      <span className="truncate">{f.nombre || 'Descuento'} (<span className="font-semibold">{f.porcentaje}%</span>):</span>
                      <strong className="shrink-0 font-mono tabular-nums">-${f.monto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-muted border-t border-line pt-2">
                    <span>IVA (<span className="font-semibold">{ivaEfectivo}%</span>):</span>
                    <strong className="font-mono tabular-nums">+${desglose.montoIva.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="text-body flex justify-between items-center">
                    <span>Envío (<span className="font-semibold">{envioEfectivo}%</span>):</span>
                    <strong className="font-mono tabular-nums">+${desglose.montoEnvio.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="flex justify-between items-center border-t border-line pt-2">
                    <span>C. Final:</span>
                    <strong className="text-ink font-mono tabular-nums">${costoFinalCalc.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="text-ink flex justify-between items-center">
                    <span className="font-semibold uppercase tracking-wider text-xs">Precio Venta:</span>
                    <strong className="text-lg font-mono tabular-nums">${pVenta.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                  </div>
                  <div className="text-body flex justify-between items-center text-xs">
                    <span>Ganancia Neta:</span>
                    <strong className="font-mono tabular-nums">+${gananciaMonto.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>

                {errors.precio && (
                  <p className="mt-2 text-xs text-danger font-medium text-right">{errors.precio}</p>
                )}
              </div>
            )}
          </div>

          {unidadNegocioActiva === '1' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="lote" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Lote (Opcional)
                </label>
                <input
                  type="text"
                  id="lote"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                  placeholder="Ej. L-2026-A"
                />
              </div>
              <div>
                <label htmlFor="dueno" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Dueño (Opcional)
                </label>
                <input
                  type="text"
                  id="dueno"
                  value={dueno}
                  onChange={(e) => setDueno(e.target.value)}
                  className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all"
                  placeholder="Dueño del lote"
                />
              </div>
            </div>
          )}

          </div>

          {/* Footer Actions */}
          <div className="flex-none flex items-center justify-end space-x-3 p-4 px-6 border-t border-line bg-canvas/50">
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
              {producto ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>

      </div>

      {/* Escáner de código de barras (tarea 8.3): onDetectado sólo llena el campo y cierra el
          modal del escáner — nunca dispara guardado (Decisión 4 de design.md). El submit sigue
          siendo la única forma de persistir. Grupo 13: antes de escribirlo, handleCodigoEscaneado
          chequea duplicados y puede abrir CodigoBarraDuplicadoModal en su lugar. */}
      <EscanerCodigoBarra
        isOpen={escanerAbierto}
        onClose={() => setEscanerAbierto(false)}
        onDetectado={handleCodigoEscaneado}
      />

      {/* Grupo 13: aviso de código duplicado apenas se escanea (no recién al guardar). */}
      <CodigoBarraDuplicadoModal
        isOpen={!!conflictoCodigoBarra}
        onClose={handleDescartarCodigoDuplicado}
        codigo={conflictoCodigoBarra?.codigo}
        productoEnConflicto={conflictoCodigoBarra?.producto}
        onDescartar={handleDescartarCodigoDuplicado}
        onQuedarme={handleQuedarmeConCodigoDuplicado}
      />
    </div>
  );
};

export default ProductoForm;
