import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Search, PackageMinus, Check } from 'lucide-react';
import { devolucionesApi } from '../api/devoluciones.api';
import { productosApi } from '../api/productos.api';
import { useUIStore } from '../store/useUIStore';
import FormattedNumberInput from './FormattedNumberInput';
import { formatearMoneda } from '../utils/formatearMoneda';

const RegistrarDevolucionProductoModal = ({ isOpen, onClose, clienteId }) => {
    const queryClient = useQueryClient();
    const { pushToast } = useUIStore();

    const [productoId, setProductoId] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [precioUnitario, setPrecioUnitario] = useState('');
    const [montoAcreditar, setMontoAcreditar] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: productos = [] } = useQuery({
        queryKey: ['productos'],
        queryFn: productosApi.getAll,
        enabled: isOpen,
    });

    const filteredProductos = productos.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedProducto = productos.find(p => p.id === Number(productoId));

    const handleProductoSelect = (prodId, precio) => {
        setProductoId(prodId);
        setPrecioUnitario(precio || 0);
        if (cantidad && cantidad > 0) {
            setMontoAcreditar((precio || 0) * cantidad);
        }
    };

    const handleCantidadChange = (e) => {
        const val = e.target.value;
        setCantidad(val);
        if (val && precioUnitario !== '') {
            setMontoAcreditar(Number(val) * precioUnitario);
        } else {
            setMontoAcreditar('');
        }
    };

    const handlePrecioUnitarioChange = (val) => {
        setPrecioUnitario(val);
        if (cantidad && val !== '') {
            setMontoAcreditar(Number(cantidad) * val);
        } else {
            setMontoAcreditar('');
        }
    };

    const handleMontoAcreditarChange = (val) => {
        setMontoAcreditar(val);
        if (cantidad && Number(cantidad) > 0 && val !== '') {
            setPrecioUnitario(val / Number(cantidad));
        }
    };

    const mutation = useMutation({
        mutationFn: devolucionesApi.registrarDevolucionLlenas,
        onSuccess: () => {
            pushToast('success', 'Devolución registrada con éxito');
            queryClient.invalidateQueries({ queryKey: ['clienteFactura', clienteId] });
            queryClient.invalidateQueries({ queryKey: ['clientes', clienteId] });
            queryClient.invalidateQueries({ queryKey: ['productos'] });
            onClose();
            // Reset form
            setProductoId('');
            setCantidad('');
            setPrecioUnitario('');
            setMontoAcreditar('');
            setSearchTerm('');
        },
        onError: (error) => {
            pushToast('error', error.response?.data?.message || 'Error al registrar devolución');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!clienteId || !productoId || !cantidad || Number(cantidad) <= 0) {
            pushToast('Por favor complete todos los campos requeridos', 'warning');
            return;
        }

        mutation.mutate({
            clienteId,
            productoId: Number(productoId),
            cantidad: Number(cantidad),
            montoAcreditar: montoAcreditar ? Number(montoAcreditar) : 0
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm">
            <div className="bg-paper border border-line-strong w-full h-full sm:h-auto max-w-md rounded-none sm:rounded-panel overflow-hidden animate-fade-in-up flex flex-col max-h-screen sm:max-h-[95vh]">
                <div className="flex-none flex justify-between items-center p-6 border-b border-line">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-soft text-accent-ink rounded-base">
                            <PackageMinus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-ink">Devolución de Sobrante</h2>
                            <p className="text-xs text-muted mt-0.5">Reingreso de producto al stock</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-faint hover:text-body transition-colors cursor-pointer">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form id="devolucion-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                        
                        <div>
                            <label className="block text-sm font-medium text-body mb-1">Producto a devolver</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all bg-canvas hover:bg-paper focus:bg-paper text-sm mb-2"
                                />
                            </div>
                            <div className="max-h-40 overflow-y-auto border border-line rounded-base bg-canvas">
                                {filteredProductos.map((prod) => (
                                    <div
                                        key={prod.id}
                                        onClick={() => handleProductoSelect(prod.id, prod.precio)}
                                        className={`p-3 cursor-pointer border-b border-line last:border-0 hover:bg-canvas transition-colors ${
                                            Number(productoId) === prod.id ? 'bg-accent/10 relative overflow-hidden' : ''
                                        }`}
                                    >
                                        {Number(productoId) === prod.id && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent"></div>
                                        )}
                                        <div className="flex justify-between items-start">
                                            <div className={`font-medium ${Number(productoId) === prod.id ? 'text-accent' : 'text-ink'}`}>
                                                {prod.nombre}
                                            </div>
                                            {Number(productoId) === prod.id && (
                                                <Check className="w-5 h-5 text-accent flex-shrink-0" />
                                            )}
                                        </div>
                                        <div className="text-sm text-muted flex justify-between mt-1">
                                            <span>Precio de venta actual:</span>
                                            <span className="font-medium text-body">${formatearMoneda(prod.precio)}</span>
                                        </div>
                                    </div>
                                ))}
                                {filteredProductos.length === 0 && (
                                    <div className="p-4 text-center text-muted text-sm">
                                        No se encontraron productos
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-body mb-1">Cant. Bandejas</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidad}
                                    onChange={handleCantidadChange}
                                    className="w-full px-4 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all bg-canvas hover:bg-paper focus:bg-paper font-semibold"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-body mb-1">Precio Unit.</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                                    <FormattedNumberInput
                                        value={precioUnitario}
                                        onChange={handlePrecioUnitarioChange}
                                        placeholder="0.00"
                                        className="w-full pl-7 pr-3 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all bg-canvas hover:bg-paper focus:bg-paper font-semibold"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-body mb-1">Monto Total</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                                    <FormattedNumberInput
                                        value={montoAcreditar}
                                        onChange={handleMontoAcreditarChange}
                                        placeholder="0.00"
                                        className="w-full pl-7 pr-3 py-2 border border-line rounded-base focus:ring-2 focus:ring-accent outline-none transition-all bg-canvas hover:bg-paper focus:bg-paper font-semibold"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {selectedProducto && cantidad && (
                            <div className="bg-accent-soft text-accent-ink p-4 rounded-base text-sm flex gap-3 border border-accent/20">
                                <PackageMinus className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    El valor de <strong>${formatearMoneda(montoAcreditar)}</strong> se calcula multiplicando las <strong>{cantidad}</strong> bandejas por el precio unitario (<strong>${formatearMoneda(precioUnitario)}</strong>). Si se cambia un valor, los otros se ajustan automáticamente.
                                </div>
                            </div>
                        )}
                        
                    </div>

                    <div className="flex-none flex gap-3 p-4 px-6 border-t border-line sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-2.5 text-body hover:bg-canvas rounded-base transition-colors font-medium cursor-pointer"
                            disabled={mutation.isPending}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending || !productoId}
                            className="flex-1 sm:flex-none px-5 py-2.5 bg-accent text-paper rounded-base hover:brightness-95 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {mutation.isPending ? (
                                <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin" />
                            ) : (
                                'Confirmar Devolución'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrarDevolucionProductoModal;
