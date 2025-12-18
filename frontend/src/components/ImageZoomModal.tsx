import React from 'react';
import { CrossIcon } from './Icons';

interface ImageZoomModalProps {
    imageUrl: string;
    onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ imageUrl, onClose }) => {
    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="relative max-w-full max-h-full flex flex-col items-center">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-white hover:text-slate-300 transition-colors bg-slate-800/50 rounded-full border border-slate-700 md:-top-4 md:-right-12"
                    aria-label="Close modal"
                >
                    <CrossIcon className="w-8 h-8" />
                </button>

                {/* Image Container */}
                <div className="shadow-2xl">
                    <img
                        src={imageUrl}
                        alt="Zoomed view"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
                    />
                </div>
            </div>
        </div>
    );
};


export default ImageZoomModal;
