/**
 * ApertureSettings - Door and window configuration options
 */

import React from 'react';
import type { FloorplanConfig, GlassType, WindowColor, WindowMaterial } from '../../../types';

interface ApertureSettingsProps {
  config: FloorplanConfig;
  onUpdateConfig: (updates: Partial<FloorplanConfig>) => void;
}

export function ApertureSettings({ config, onUpdateConfig }: ApertureSettingsProps) {
  const defaults = config.apertureDefaults || {
    cristal: 'doble' as GlassType,
    color: 'blanco' as WindowColor,
    material: 'pvc' as WindowMaterial,
    persiana: false,
    porcentajeMarcoVentana: 20,
    porcentajeMarcoPuerta: 100
  };

  const updateApertureDefaults = (updates: Partial<typeof defaults>) => {
    onUpdateConfig({
      apertureDefaults: { ...defaults, ...updates }
    });
  };

  return (
    <div className="space-y-4">
      {/* Glass Type */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Tipo de Cristal
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => updateApertureDefaults({ cristal: 'simple' })}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              defaults.cristal === 'simple'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => updateApertureDefaults({ cristal: 'doble' })}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              defaults.cristal === 'doble'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Doble
          </button>
          <button
            onClick={() => updateApertureDefaults({ cristal: 'triple' })}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              defaults.cristal === 'triple'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Triple
          </button>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Color
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => updateApertureDefaults({ color: 'blanco' })}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border-2 ${
              defaults.color === 'blanco'
                ? 'border-blue-600 bg-white text-gray-900 ring-2 ring-blue-200'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-400"></div>
              Blanco
            </div>
          </button>
          <button
            onClick={() => updateApertureDefaults({ color: 'azul' })}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border-2 ${
              defaults.color === 'azul'
                ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                : 'border-gray-300 bg-blue-50 text-blue-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              Azul
            </div>
          </button>
          <button
            onClick={() => updateApertureDefaults({ color: 'verde' })}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border-2 ${
              defaults.color === 'verde'
                ? 'border-blue-600 bg-green-50 text-green-900 ring-2 ring-blue-200'
                : 'border-gray-300 bg-green-50 text-green-700 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              Verde
            </div>
          </button>
        </div>
      </div>

      {/* Material */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Material
        </label>
        <div className="space-y-2">
          <button
            onClick={() => updateApertureDefaults({ material: 'madera' })}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-all text-left ${
              defaults.material === 'madera'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Madera
          </button>
          <button
            onClick={() => updateApertureDefaults({ material: 'pvc' })}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-all text-left ${
              defaults.material === 'pvc'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            PVC
          </button>
          <button
            onClick={() => updateApertureDefaults({ material: 'aluminio' })}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-all text-left ${
              defaults.material === 'aluminio'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aluminio
          </button>
          <button
            onClick={() => updateApertureDefaults({ material: 'aluminio_puente_termico' })}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-all text-left ${
              defaults.material === 'aluminio_puente_termico'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aluminio con Puente Térmico
          </button>
        </div>
      </div>

      {/* Persiana */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-900">Persiana</div>
            <div className="text-xs text-gray-500">Incluir persiana por defecto</div>
          </div>
          <button
            onClick={() => updateApertureDefaults({ persiana: !defaults.persiana })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              defaults.persiana ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                defaults.persiana ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Porcentaje Marco Ventana */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Porcentaje Marco (Ventanas)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={defaults.porcentajeMarcoVentana}
            onChange={(e) => updateApertureDefaults({ porcentajeMarcoVentana: Number(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={defaults.porcentajeMarcoVentana}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                updateApertureDefaults({ porcentajeMarcoVentana: val });
              }}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Porcentaje del marco respecto al cristal en ventanas</p>
      </div>

      {/* Porcentaje Marco Puerta */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Porcentaje Marco (Puertas)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={defaults.porcentajeMarcoPuerta}
            onChange={(e) => updateApertureDefaults({ porcentajeMarcoPuerta: Number(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="100"
              value={defaults.porcentajeMarcoPuerta}
              onChange={(e) => {
                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                updateApertureDefaults({ porcentajeMarcoPuerta: val });
              }}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Porcentaje del marco respecto al cristal en puertas</p>
      </div>

      {/* Info note */}
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          Estas configuraciones se aplicarán por defecto a todas las nuevas ventanas y puertas que añadas.
        </p>
      </div>
    </div>
  );
}
