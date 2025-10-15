import React from 'react';
import { FaTimes } from 'react-icons/fa';

const MinimalOfferView = ({ setOfferView,offerItem }) => {
    // Render nothing if the modal isn't open
    
 
    return (
        // Overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-opacity-60 backdrop-blur-sm">
            
            {/* Modal Content */}
            <div className="relative w-full max-w-sm p-8 bg-white shadow-xl rounded-2xl">
                
                {/* Close Button */}
                <button 
                    onClick={() => setOfferView(false)} 
                    className="absolute p-2 text-gray-400 rounded-full top-3 right-3 hover:bg-gray-100"
                    aria-label="Close"
                >
                    <FaTimes size={20} />
                </button>

                {/* Simplified Content */}
                <div className="text-center">
                    <p className="mb-1 text-sm text-gray-500">Offer on</p>
                    <h2 className="mb-6 text-xl font-bold text-gray-800">{offerItem.itemName}</h2>

                    <div className="flex justify-around">
                        {/* Required Quantity */}
                        <div>
                            <p className="text-sm text-gray-600">Buy</p>
                            <p className="text-4xl font-bold text-purple-600">{offerItem.requiredQty}</p>
                        </div>
                        {/* Free Quantity */}
                        <div>
                            <p className="text-sm text-gray-600">Get Free</p>
                            <p className="text-4xl font-bold text-green-600">{offerItem.freeQty}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MinimalOfferView;