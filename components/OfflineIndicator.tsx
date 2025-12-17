
import React from 'react';

interface OfflineIndicatorProps {
  isOffline: boolean;
  updateAvailable: boolean;
  onUpdate: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOffline,
  updateAvailable,
  onUpdate,
}) => {
  if (!isOffline && !updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 print:hidden">
      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg shadow-lg border border-amber-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <div>
            <p className="font-semibold text-sm">You're offline</p>
            <p className="text-xs">Some features may be limited</p>
          </div>
        </div>
      )}

      {updateAvailable && !isOffline && (
        <div className="flex items-center gap-3 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg border border-blue-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <p className="font-semibold text-sm">Update available</p>
            <p className="text-xs">Click to refresh</p>
          </div>
          <button
            onClick={onUpdate}
            className="ml-2 bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700"
          >
            Update
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
