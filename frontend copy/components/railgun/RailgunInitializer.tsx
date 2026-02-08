'use client';

import React from 'react';
import { useRailgun } from '@/contexts/RailgunContext';

/**
 * RailgunInitializer component
 * Displays Railgun initialization status and provides initialization button
 */
export function RailgunInitializer() {
  const { isInitialized, isInitializing, error, initialize } = useRailgun();

  if (isInitialized) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-green-700">Privacy Enabled</span>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium text-blue-700">Initializing Privacy...</span>
        <span className="text-xs text-blue-500">(may take 1-2 min)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <span className="text-xs font-medium text-red-700">Privacy Init Failed</span>
        </div>
        <div className="text-xs text-red-600 max-w-xs truncate" title={error.message}>
          {error.message}
        </div>
        <button
          onClick={() => initialize().catch(console.error)}
          className="text-xs text-red-600 underline hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="text-xs text-gray-600">Privacy Disabled</span>
      <button
        onClick={() => initialize().catch(console.error)}
        className="text-xs text-blue-600 font-medium hover:text-blue-800"
      >
        Enable
      </button>
    </div>
  );
}
