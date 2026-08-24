import axios from './axios';

export const getFacturaActiva = async (clienteId) => {
    const res = await axios.get(`/facturas/cliente/${clienteId}/activa`);
    return res.data;
};

export const getHistorialFacturas = async (clienteId) => {
    const res = await axios.get(`/facturas/cliente/${clienteId}/historial`);
    return res.data;
};

export const agregarConceptoFactura = async (facturaId, concepto) => {
    const res = await axios.post(`/facturas/${facturaId}/conceptos`, concepto);
    return res.data;
};

export const cerrarFactura = async (facturaId) => {
    const res = await axios.post(`/facturas/${facturaId}/cerrar`);
    return res.data;
};

export const registrarPagoFactura = async (facturaId, payload) => {
    const res = await axios.post(`/facturas/${facturaId}/pagos`, payload);
    return res.data;
};

export const rechazarPagoFactura = async (pagoId) => {
    const res = await axios.put(`/facturas/pagos/${pagoId}/rechazar`);
    return res.data;
};

export const abrirFacturaManual = async (clienteId) => {
    const res = await axios.post(`/facturas/cliente/${clienteId}/abrir`);
    return res.data;
};
