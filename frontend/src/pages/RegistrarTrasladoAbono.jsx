import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Calendar, Search } from 'lucide-react';
import { abonoApi } from '../api/abono.api';
import { productosApi } from '../api/productos.api';
import { useUIStore } from '../store/useUIStore';

// El backend sigue guardando la ubicación como "COLEGA" (UbicacionAbono.COLEGA, sin tocar por ser
// un cambio puramente cosmético) -- acá sólo se traduce a la etiqueta visible pedida por el dueño
// (2026-09-04): "Depósito 2" en vez de "Colega".
const mostrarUbicacion = (ubicacion) => (ubicacion === 'COLEGA' ? 'Depósito 2' : 'Invernadero');

const RegistrarTrasladoAbono = () => {
  const { pushToast } = useUIStore();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const size = 10;

  const [formData, setFormData] = useState({
    productoId: '',
    cantidad: '',
    fecha: new Date().toISOString().split('T')[0],
    direccion: 'INVERNADERO_A_COLEGA',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const productosQuery = useQuery({
    queryKey: ['productos'],
    queryFn: () => productosApi.getAll(),
  });

  const historialQuery = useQuery({
    queryKey: ['abono', 'historial', { page, size, tipos: 'traslados' }],
    queryFn: () => abonoApi.getHistorial(page, size, 'TRASLADO_ENTRADA').then(res => res.data),
  });

  const stockQuery = useQuery({
    queryKey: ['abono', 'stock', 'consolidado'],
    queryFn: () => abonoApi.getStockConsolidado().then(res => res.data),
  });

  // Stock agrupado para validar disponibilidad al registrar el traslado
  const stockConsolidado = useMemo(() => {
    if (!stockQuery.data) return [];
    return stockQuery.data.sort((a, b) => a.nombreProducto.localeCompare(b.nombreProducto));
  }, [stockQuery.data]);

  const getStockDisponible = (productoId, direccion) => {
    if (!stockConsolidado.length || !productoId) return 0;
    const item = stockConsolidado.find(s => s.productoId === parseInt(productoId));
    if (!item) return 0;
    return direccion === 'COLEGA_A_INVERNADERO' ? item.stockColega : item.stockInvernadero;
  };

  const trasladoMutation = useMutation({
    mutationFn: (data) => abonoApi.registrarTraslado(data),
    onSuccess: () => {
      pushToast('success', 'Traslado registrado con éxito');
      setFormData({ ...formData, cantidad: '' });
      queryClient.invalidateQueries({ queryKey: ['abono'] });
    },
    onError: (error) => {
      const msg = error.response?.data?.message || error.response?.data || 'Error al registrar traslado';
      pushToast('error', typeof msg === 'string' ? msg : 'Error al registrar traslado');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productoId || !formData.cantidad || formData.cantidad <= 0) {
      pushToast('warn', 'Complete los campos correctamente');
      return;
    }

    const cant = parseInt(formData.cantidad);
    const disp = getStockDisponible(formData.productoId, formData.direccion);
    if (cant > disp) {
      pushToast('error', `Stock insuficiente en ${mostrarUbicacion(formData.direccion === 'COLEGA_A_INVERNADERO' ? 'COLEGA' : 'INVERNADERO')} (disponible: ${disp})`);
      return;
    }

    trasladoMutation.mutate({
      productoId: parseInt(formData.productoId),
      cantidad: cant,
      fecha: formData.fecha,
      direccion: formData.direccion,
      motivo: 'TRASLADO'
    });
  };

  const filteredProductos = productosQuery.data?.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const isSaving = trasladoMutation.isPending;
  const stockDisponible = getStockDisponible(formData.productoId, formData.direccion);

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Traslados de Abono</h1>
        <p className="text-muted mt-1">Gestionar movimientos de stock entre Invernadero y Depósito 2</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-paper border border-line rounded-panel p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-ink mb-6 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-accent" />
              Nuevo Traslado
            </h2>

            <div className="space-y-4">
              <div className="flex flex-col gap-1 mb-4">
                <label className="block text-sm font-semibold text-body">Dirección del Traslado</label>
                <div className="flex bg-canvas p-1 rounded-base border border-line">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, direccion: 'INVERNADERO_A_COLEGA' })}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${formData.direccion === 'INVERNADERO_A_COLEGA' ? 'bg-paper text-ink' : 'text-muted hover:text-body cursor-pointer'}`}
                  >
                    Hacia Depósito 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, direccion: 'COLEGA_A_INVERNADERO' })}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${formData.direccion === 'COLEGA_A_INVERNADERO' ? 'bg-paper text-ink' : 'text-muted hover:text-body cursor-pointer'}`}
                  >
                    Hacia Invernadero
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-body mb-1">Producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      if (formData.productoId) setFormData({ ...formData, productoId: '' });
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                    placeholder="Buscar producto..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent bg-transparent"
                  />
                </div>
                {isDropdownOpen && filteredProductos.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-paper border border-line rounded-base shadow-lg max-h-48 overflow-y-auto">
                    {filteredProductos.map(p => (
                      <div
                        key={p.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-canvas text-ink"
                        onClick={() => {
                          setFormData({ ...formData, productoId: p.id });
                          setSearchTerm(p.nombre);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {p.nombre}
                      </div>
                    ))}
                  </div>
                )}
                {formData.productoId && (
                  <p className="text-xs text-muted mt-1 font-medium">
                    Disponible en {mostrarUbicacion(formData.direccion === 'COLEGA_A_INVERNADERO' ? 'COLEGA' : 'INVERNADERO')}: <span className="font-mono tabular-nums">{stockDisponible}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-body mb-1">Cantidad a trasladar</label>
                <input
                  type="number"
                  min="1"
                  max={stockDisponible || 1}
                  value={formData.cantidad}
                  onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                  className="w-full border border-line rounded-base px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-body mb-1">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-base focus:ring-2 focus:ring-accent focus:border-accent bg-transparent"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving || !formData.productoId || formData.cantidad > stockDisponible}
                className="w-full py-2.5 mt-2 bg-accent text-paper font-semibold rounded-base hover:bg-accent-hi transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Registrando...' : 'Registrar Traslado'}
              </button>
            </div>
          </form>
        </div>

        {/* Historial */}
        <div className="lg:col-span-2">
          <div className="bg-paper border border-line rounded-panel overflow-hidden">
            <div className="p-4 border-b border-line bg-thead/50">
              <h2 className="text-lg font-semibold text-ink">Historial de Movimientos</h2>
            </div>

            {historialQuery.isLoading ? (
              <div className="p-8 text-center text-muted">Cargando historial...</div>
            ) : historialQuery.data?.content?.length === 0 ? (
              <div className="p-12 text-center text-muted">No hay movimientos registrados.</div>
            ) : (
              <>
                {/* Vista Mobile (Tarjetas) */}
                <div className="md:hidden divide-y divide-line">
                  {historialQuery.data?.content?.map((mov) => {
                    const origen = mov.ubicacion === 'COLEGA' ? 'INVERNADERO' : 'COLEGA';
                    const destino = mov.ubicacion;
                    return (
                      <div key={mov.id} className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-ink text-sm">{mov.productoNombre}</h3>
                            <p className="text-xs text-muted">{new Date(mov.fecha).toLocaleDateString('es-AR')}</p>
                          </div>
                          <span className="font-mono tabular-nums font-semibold text-sm bg-accent/10 text-accent-ink px-2 py-0.5 rounded">
                            {mov.cantidad}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted">Ruta:</span>
                          <span className="text-body font-medium">
                            {mostrarUbicacion(origen)} <span className="text-muted mx-1">➔</span> {mostrarUbicacion(destino)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted">Usuario:</span>
                          <span className="text-body font-medium">{mov.usuarioNombre || '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Vista Desktop (Tabla) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-thead border-b border-line">
                        <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider text-right">Cantidad</th>
                        <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Motivo</th>
                        <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Ruta</th>
                        <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {historialQuery.data?.content?.map((mov) => {
                        const origen = mov.ubicacion === 'COLEGA' ? 'INVERNADERO' : 'COLEGA';
                        const destino = mov.ubicacion;
                        return (
                          <tr key={mov.id} className="hover:bg-canvas transition-colors">
                            <td className="px-4 py-3 text-sm text-body">
                              {new Date(mov.fecha).toLocaleDateString('es-AR')}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-ink">{mov.productoNombre}</td>
                            <td className="px-4 py-3 text-sm text-right font-mono tabular-nums font-medium text-body">
                              {mov.cantidad}
                            </td>
                            <td className="px-4 py-3 text-sm text-body">TRASLADO</td>
                            <td className="px-4 py-3 text-sm text-body font-medium">
                              {mostrarUbicacion(origen)} <span className="text-muted mx-1">➔</span> {mostrarUbicacion(destino)}
                            </td>
                            <td className="px-4 py-3 text-sm text-body font-medium">{mov.usuarioNombre || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Paginador */}
            {historialQuery.data?.totalPages > 1 && (
              <div className="p-4 border-t border-line flex items-center justify-between bg-thead/30">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
                >
                  Anterior
                </button>
                <span className="text-sm font-medium text-muted">
                  Página {page + 1} de {historialQuery.data.totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= historialQuery.data.totalPages - 1}
                  className="px-3 py-1.5 text-sm font-medium text-body bg-paper border border-line rounded-base hover:bg-canvas disabled:opacity-50 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrarTrasladoAbono;
