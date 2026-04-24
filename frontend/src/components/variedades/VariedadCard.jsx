import React from 'react';
import { Trash2, Edit3 } from 'lucide-react';

export const VariedadCard = ({ variedad, onDelete, onEdit }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 flex justify-between items-center">
      <div>
        <p className="font-bold text-gray-800">{variedad.nombre}</p>
        <p className="text-xs text-green-600 font-semibold uppercase mt-1">
          Ciclo: {variedad.diasInvernaderoSugeridos} días
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onEdit(variedad)} className="text-blue-400 hover:text-blue-600 p-1">
          <Edit3 size={18} />
        </button>
        <button onClick={() => onDelete(variedad.id)} className="text-gray-300 hover:text-red-500 p-1">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};