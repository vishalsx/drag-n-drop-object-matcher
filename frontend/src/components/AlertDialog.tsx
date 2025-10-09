import React from 'react';

interface AlertDialogProps {
  title: string;
  message: string;
  onClose: () => void;
}

const AlertDialog: React.FC<AlertDialogProps> = ({ title, message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="alert-dialog-title">
      <div className="w-full max-w-sm p-6 bg-slate-800 rounded-lg shadow-2xl animate-fadeIn border border-slate-700">
        <h2 id="alert-dialog-title" className="text-lg font-bold text-yellow-300">{title}</h2>
        <p className="mt-2 text-slate-400">{message}</p>
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
