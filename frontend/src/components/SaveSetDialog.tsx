import React, { useState, useEffect } from 'react';
import { SpinnerIcon } from './Icons';

interface SaveSetDialogProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const SaveSetDialog: React.FC<SaveSetDialogProps> = ({ isOpen, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(''); // Reset name when dialog opens
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim() && !isSaving) {
      onSave(name.trim());
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
      <div className="w-full max-w-sm p-6 bg-slate-800 rounded-lg shadow-2xl animate-fadeIn border border-slate-700">
        <h2 id="save-dialog-title" className="text-lg font-bold text-slate-200">Save Card Set</h2>
        <p className="mt-2 text-sm text-slate-400">Please provide a name for this set of cards.</p>
        <div className="mt-4">
          <label htmlFor="card-set-name" className="sr-only">Card set name</label>
          <input
            id="card-set-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g., Household Objects"
            className="w-full bg-slate-700 border border-slate-600 text-white py-2 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <SpinnerIcon className="w-5 h-5" /> : null}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveSetDialog;
