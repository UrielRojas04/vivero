import React, { useState, useEffect } from 'react';

/**
 * Componente que envuelve un input y formatea automáticamente los números
 * con separadores de miles y coma decimal (estilo es-AR).
 * Mantiene internamente el valor formateado pero dispara el onChange con el valor numérico (crudo).
 */
const FormattedNumberInput = ({
  value,
  onChange,
  className = '',
  placeholder = '',
  disabled = false,
  id = '',
  required = false
}) => {
  // Estado local para mostrar el string formateado en el input
  const [displayValue, setDisplayValue] = useState('');

  // Función para formatear el valor a string (ej. 1500000.5 -> "1.500.000,5")
  const formatValue = (val) => {
    if (val === null || val === undefined || val === '') return '';
    
    // Si viene como string que termina en coma o punto (ej. "15,"), permitimos que siga editando sin borrar la coma
    if (typeof val === 'string' && (val.endsWith(',') || val.endsWith('.'))) {
      return val; 
    }

    const numberValue = parseFloat(val);
    if (isNaN(numberValue)) return '';

    return new Intl.NumberFormat('es-AR', {
      maximumFractionDigits: 2,
    }).format(numberValue);
  };

  // Sincronizar estado local cuando cambia el valor desde afuera (prop 'value')
  useEffect(() => {
    // Solo formateamos si el valor que llega es diferente al numérico del estado actual
    // para evitar sobreescribir mientras el usuario tipea (como cuando pone una coma "1500,").
    const parsedCurrent = parseRawNumber(displayValue);
    if (value !== parsedCurrent) {
      setDisplayValue(formatValue(value));
    }
  }, [value]);

  // Función para des-formatear (ej. "1.500.000,50" -> 1500000.5)
  const parseRawNumber = (str) => {
    if (!str) return null;
    
    // Reemplazar puntos (separador de miles) por nada, y comas por puntos (decimales)
    let rawStr = str.replace(/\./g, '').replace(/,/g, '.');
    
    // Si la cadena está vacía luego de limpiar, retornar null
    if (!rawStr || isNaN(parseFloat(rawStr))) return null;

    return parseFloat(rawStr);
  };

  const handleChange = (e) => {
    let inputValue = e.target.value;

    // Permitir solo números, comas y puntos.
    // Reemplazamos cualquier caracter que no sea número o coma/punto.
    inputValue = inputValue.replace(/[^\d.,]/g, '');

    // Para evitar formateos saltarines mientras escribe un decimal, 
    // solo actualizamos el displayValue temporal y dejamos que el user siga escribiendo.
    // Sin embargo, si queremos formateo estricto, debemos reconstruir.
    
    // Contamos comas y puntos
    const hasDecimalSeparator = inputValue.includes(',') || inputValue.includes('.');
    
    // Si terminó borrando todo
    if (inputValue === '') {
      setDisplayValue('');
      if (onChange) onChange('');
      return;
    }

    // Convertimos la entrada a un número raw para pasarlo al padre
    const rawNumber = parseRawNumber(inputValue);

    // Formatear para mostrar
    // Si el usuario está tipeando una coma, no queremos que formatValue se la coma.
    if (inputValue.endsWith(',') || inputValue.endsWith('.')) {
      // Reemplazamos punto por coma si tipeó punto
      const safeInput = inputValue.replace(/\./g, ',');
      setDisplayValue(safeInput);
      if (onChange && rawNumber !== null) onChange(rawNumber);
    } else {
      // Intentamos formatear lo que tenemos
      const formatted = formatValue(rawNumber);
      
      // Si formatValue nos devuelve vacío pero el input no lo estaba, mantenemos inputValue limpio
      if (formatted === '' && inputValue !== '') {
        setDisplayValue(inputValue);
      } else {
        setDisplayValue(formatted);
      }
      
      if (onChange && rawNumber !== null) {
        onChange(rawNumber);
      }
    }
  };

  return (
    <input
      type="text"
      id={id}
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoComplete="off"
    />
  );
};

export default FormattedNumberInput;
