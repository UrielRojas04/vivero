import React from 'react';

/**
 * Componente de input numérico.
 * Usa type="number" e inputMode="numeric" para forzar teclados numéricos en mobile.
 * Oculta los spinners nativos mediante clases CSS y estilos.
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

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      if (onChange) onChange('');
      return;
    }
    // Como es type="number", el value ya viene parseable (ej. "15.5") o vacío si es inválido
    const rawNumber = parseFloat(val);
    if (onChange && !isNaN(rawNumber)) {
      onChange(rawNumber);
    }
  };

  // Convertimos a string para evitar warnings de React si el valor es null/undefined
  const displayValue = (value !== null && value !== undefined) ? value : '';

  return (
    <input
      type="number"
      inputMode="numeric"
      pattern="[0-9]*"
      id={id}
      value={displayValue}
      onChange={handleChange}
      // Clases para esconder los spinners en Webkit
      className={`${className} [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoComplete="off"
      // Estilo inline para esconder spinners en Firefox
      style={{ MozAppearance: 'textfield' }}
    />
  );
};

export default FormattedNumberInput;
