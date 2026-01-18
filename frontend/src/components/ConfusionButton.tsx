import React from 'react';

interface ConfusionButtonProps {
    onMark: () => void;
    markerCount: number;
    isRecording: boolean;
}

const ConfusionButton: React.FC<ConfusionButtonProps> = ({ onMark, markerCount, isRecording }) => {
    if (!isRecording) return null;

    return (
        <button
            onClick={onMark}
            className="fixed bottom-24 right-6 z-50 group"
            title="Mark this moment as confusing"
        >
            <div className="relative">
                {/* Main button */}
                <div className="w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-full shadow-lg shadow-amber-200 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
                    <span className="text-2xl">🤔</span>
                </div>

                {/* Marker count badge */}
                {markerCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                        {markerCount}
                    </div>
                )}

                {/* Tooltip */}
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                        I'm Confused
                        <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default ConfusionButton;
