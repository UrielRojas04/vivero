import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import ProductoForm from '../components/ProductoForm';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Sparkles, Inbox, Leaf } from 'lucide-react';

const Productos = () => {
  const { pushToast, denyAccess, askConfirm } = useUIStore();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);

  const fetchProductos = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/productos');
      setProductos(response.data || []);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        setError('No tienes permisos suficientes para ver el catálogo de productos (requiere LEER_STOCK).');
      } else {
        setError('Ocurrió un error al cargar los productos. Por favor, reintente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleCreateOrUpdate = async (formData) => {
    try {
      if (selectedProducto) {
        // Edit mode
        await api.put(`/productos/${selectedProducto.id}`, formData);
      } else {
        // Create mode
        await api.post('/productos', formData);
      }
      setIsFormOpen(false);
      setSelectedProducto(null);
      fetchProductos();
      pushToast('success', 'Producto guardado correctamente.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para modificar el stock de productos (requiere ESCRIBIR_STOCK).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al guardar el producto. Verifica los datos.'));
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/productos/${id}`);
      fetchProductos();
      pushToast('success', 'Producto eliminado.');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 403) {
        denyAccess('No tienes permisos para eliminar productos (requiere ESCRIBIR_STOCK).');
      } else {
        pushToast('error', getErrorMessage(err, 'Ocurrió un error al eliminar el producto.'));
      }
    }
  };

  const filteredProductos = productos.filter((p) =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h1>
            <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
          </div>
          <p className="mt-1 text-sm text-gray-500">Gestión de plantas, inventario y precios de venta.</p>
        </div>
        
        <button
          onClick={() => {
            setSelectedProducto(null);
            setIsFormOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Search and Feedback Area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 h-5 text-gray-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50 transition-all"
          />
        </div>

        <div className="text-sm text-gray-500 font-medium">
          Total: <span className="text-gray-900 font-semibold">{filteredProductos.length}</span> plantas
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-800">Error de Acceso</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center gap-3 shadow-sm">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Cargando inventario de plantas...</p>
        </div>
      ) : filteredProductos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
            {searchTerm ? <Search className="w-8 h-8 text-gray-400" /> : <Inbox className="w-8 h-8 text-gray-400" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {searchTerm ? 'No se encontraron resultados' : 'El catálogo está vacío'}
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            {searchTerm 
              ? 'Prueba modificando los términos de búsqueda o borrando el filtro.'
              : 'Comienza agregando tu primer producto al vivero presionando el botón "Nuevo Producto".'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => {
                setSelectedProducto(null);
                setIsFormOpen(true);
              }}
              className="mt-6 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-sm transition-colors border border-emerald-100 cursor-pointer"
            >
              Crear primer planta
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Planta</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProductos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-semibold">
                          <Leaf className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-gray-900 text-sm">{producto.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500 max-w-md truncate" title={producto.descripcion}>
                        {producto.descripcion || <span className="text-gray-300 italic">Sin descripción</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        ${producto.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        producto.stock === 0 
                          ? 'bg-red-50 text-red-700' 
                          : producto.stock <= 5 
                            ? 'bg-yellow-50 text-yellow-700' 
                            : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {producto.stock} unidades
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedProducto(producto);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() =>
                            askConfirm({
                              title: '¿Confirmar Eliminación?',
                              message: 'Esta acción no se puede deshacer. Se removerá la planta de forma permanente del catálogo y del control de inventario.',
                              variant: 'danger',
                              confirmLabel: 'Eliminar Planta',
                              onConfirm: () => handleDelete(producto.id),
                            })
                          }
                          className="p-1.5 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reuse Form Modal Component */}
      <ProductoForm
        isOpen={isFormOpen}
        producto={selectedProducto}
        onSave={handleCreateOrUpdate}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedProducto(null);
        }}
      />
    </div>
  );
};

export default Productos;
