import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useStockStore } from '../store/useStockStore';

export const useStockEvents = () => {
  const { token } = useAuthStore();
  const updateStock = useStockStore(state => state.updateStock);

  useEffect(() => {
    if (!token) return;

    const eventSourceUrl = `http://localhost:8080/api/events/stock?token=${token}`;
    const eventSource = new EventSource(eventSourceUrl);

    eventSource.addEventListener('STOCK_UPDATE', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.productoId !== undefined && data.nuevoStock !== undefined) {
          updateStock(data.productoId, data.nuevoStock);
        }
      } catch (err) {
        console.error("Error parsing SSE data", err);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE Connection Error", err);
      // Browser EventSource automatically reconnects unless we close it
    };

    return () => {
      eventSource.close();
    };
  }, [token, updateStock]);
};
