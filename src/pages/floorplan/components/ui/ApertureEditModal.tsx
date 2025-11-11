/**
 * ApertureEditModal - Modal for editing doors and windows
 */

import React, { useState, useEffect } from 'react';
import type { Aperture, GlassType, WindowColor, WindowMaterial, FloorplanConfig } from '../../types';

interface ApertureEditModalProps {
  aperture: Aperture;
  config: FloorplanConfig;
  onSave: (updates: Partial<Aperture>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ApertureEditModal({ aperture, config, onSave, onDelete, onClose }: ApertureEditModalProps) {
  // Get defaults from config
  const defaults = config.apertureDefaults || {
    cristal: 'doble' as GlassType,
    color: 'blanco' as WindowColor,
    material: 'pvc' as WindowMaterial,
    persiana: false,
    porcentajeMarcoVentana: 20,
    porcentajeMarcoPuerta: 100
  };

  // Form state - use aperture values OR config defaults
  const [type, setType] = useState<'door' | 'window'>(aperture.type);
  const [width, setWidth] = useState(aperture.width);
  const [height, setHeight] = useState(aperture.height);
  const [distance, setDistance] = useState(aperture.distance);
  const [anchorVertex, setAnchorVertex] = useState<'start' | 'end'>(aperture.anchorVertex);
  const [sillHeight, setSillHeight] = useState(aperture.sillHeight || 0.9);

  // Aperture-specific properties - use aperture values OR config defaults
  const [cristal, setCristal] = useState<GlassType>(aperture.cristal || defaults.cristal);
  const [color, setColor] = useState<WindowColor>(aperture.color || defaults.color);
  const [material, setMaterial] = useState<WindowMaterial>(aperture.material || defaults.material);
  const [persiana, setPersiana] = useState(aperture.persiana ?? defaults.persiana);
  const [porcentajeMarco, setPorcentajeMarco] = useState(
    aperture.porcentajeMarco ||
    (aperture.type === 'door' ? defaults.porcentajeMarcoPuerta : defaults.porcentajeMarcoVentana)
  );

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    // Only save properties that differ from defaults (custom values)
    // If a value matches the default, save as undefined so it inherits from config
    const updates: Partial<Aperture> = {
      type,
      width,
      height,
      distance,
      anchorVertex,
      sillHeight: type === 'window' ? sillHeight : undefined,
      // Material properties - only save if different from defaults
      cristal: type === 'window' && cristal !== defaults.cristal ? cristal : undefined,
      color: color !== defaults.color ? color : undefined,
      material: material !== defaults.material ? material : undefined,
      persiana: type === 'window' && persiana !== defaults.persiana ? persiana : undefined,
      porcentajeMarco: porcentajeMarco !== (type === 'door' ? defaults.porcentajeMarcoPuerta : defaults.porcentajeMarcoVentana)
        ? porcentajeMarco
        : undefined,
    };
    onSave(updates);
    onClose();
  };

  // Update porcentajeMarco when type changes
  useEffect(() => {
    if (type === 'door' && porcentajeMarco !== defaults.porcentajeMarcoPuerta) {
      setPorcentajeMarco(defaults.porcentajeMarcoPuerta);
    } else if (type === 'window' && aperture.type === 'door') {
      // Switching from door to window, use window default
      setPorcentajeMarco(defaults.porcentajeMarcoVentana);
    }
  }, [type, aperture.type, defaults.porcentajeMarcoPuerta, defaults.porcentajeMarcoVentana, porcentajeMarco]);

  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta abertura?')) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {aperture.type === 'door' ? 'Editar Puerta' : 'Editar Ventana'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('door')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  type === 'door'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Puerta
              </button>
              <button
                onClick={() => setType('window')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  type === 'window'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Ventana
              </button>
            </div>
          </div>

          {/* Width */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Ancho (metros)
            </label>
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Alto (metros)
            </label>
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sill Height (only for windows) */}
          {type === 'window' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Altura de Alféizar (metros)
              </label>
              <input
                type="number"
                min="0"
                max="3"
                step="0.1"
                value={sillHeight}
                onChange={(e) => setSillHeight(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Distancia desde {anchorVertex === 'start' ? 'inicio' : 'final'} (metros)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Anchor Vertex */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Anclaje
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAnchorVertex('start')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  anchorVertex === 'start'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inicio de Pared
              </button>
              <button
                onClick={() => setAnchorVertex('end')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  anchorVertex === 'end'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Final de Pared
              </button>
            </div>
          </div>

          {/* Glass Type (for windows) */}
          {type === 'window' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Tipo de Cristal
                {aperture.cristal === undefined && (
                  <span className="ml-2 text-xs text-blue-600">(heredado)</span>
                )}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCristal('simple')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    cristal === 'simple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Simple
                </button>
                <button
                  onClick={() => setCristal('doble')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    cristal === 'doble'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Doble
                </button>
                <button
                  onClick={() => setCristal('triple')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    cristal === 'triple'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Triple
                </button>
              </div>
            </div>
          )}

          {/* Material */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Material
              {aperture.material === undefined && (
                <span className="ml-2 text-xs text-blue-600">(heredado)</span>
              )}
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as WindowMaterial)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="madera">Madera</option>
              <option value="pvc">PVC</option>
              <option value="aluminio">Aluminio</option>
              <option value="aluminio_puente_termico">Aluminio con Puente Térmico</option>
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Color
              {aperture.color === undefined && (
                <span className="ml-2 text-xs text-blue-600">(heredado)</span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setColor('blanco')}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border-2 ${
                  color === 'blanco'
                    ? 'border-blue-600 bg-white text-gray-900 ring-2 ring-blue-200'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Blanco
              </button>
              <button
                onClick={() => setColor('azul')}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border-2 ${
                  color === 'azul'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                    : 'border-gray-300 bg-blue-50 text-blue-700 hover:border-gray-400'
                }`}
              >
                Azul
              </button>
              <button
                onClick={() => setColor('verde')}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-all border-2 ${
                  color === 'verde'
                    ? 'border-blue-600 bg-green-50 text-green-900 ring-2 ring-blue-200'
                    : 'border-gray-300 bg-green-50 text-green-700 hover:border-gray-400'
                }`}
              >
                Verde
              </button>
            </div>
          </div>

          {/* Persiana (for windows) */}
          {type === 'window' && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Persiana
                    {aperture.persiana === undefined && (
                      <span className="ml-2 text-xs text-blue-600">(heredado)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Incluir persiana</div>
                </div>
                <button
                  onClick={() => setPersiana(!persiana)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    persiana ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      persiana ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Porcentaje Marco */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Porcentaje Marco ({type === 'door' ? 'Puerta' : 'Ventana'})
              {aperture.porcentajeMarco === undefined && (
                <span className="ml-2 text-xs text-blue-600">(heredado)</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={porcentajeMarco}
                onChange={(e) => setPorcentajeMarco(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={porcentajeMarco}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, Number(e.target.value)));
                    setPorcentajeMarco(val);
                  }}
                  className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Porcentaje del marco respecto al cristal
            </p>
          </div>
        </div>

        {/* Info about inherited properties */}
        <div className="px-6 pb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              Las propiedades marcadas como <span className="font-semibold">(heredado)</span> se actualizan automáticamente cuando cambias los valores por defecto en Configuración. Si cambias una propiedad heredada, se guardará como valor personalizado.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            Eliminar
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
