
import React, { useState } from 'react';
import { FiEdit, FiTrash2, FiInfo, FiImage, FiX } from 'react-icons/fi';

const ItemListPage = ({ items, heading, onClose }) => {
  const [expandedItem, setExpandedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-6xl mx-4 bg-transparent rounded-lg shadow-2xl">
        <div className="overflow-hidden bg-white rounded-lg bg-opacity-90 backdrop-blur-sm">
          <div className="flex items-center justify-between p-6 bg-white bg-opacity-80">
<div className="flex items-center justify-between">
  <h1 className="text-2xl font-bold text-gray-800">{heading}</h1>
  {onClose && (
    <button 
      onClick={onClose}
      className="p-2 text-gray-500 transition rounded-full hover:bg-gray-200 hover:text-gray-700"
      title="Close"
    >
      <FiX size={20} />
    </button>
  )}
</div>

            
           
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white bg-opacity-70">
              <FiInfo className="mb-4 text-5xl text-gray-400" />
              <p className="text-lg text-gray-600">No items found</p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-blue-600 hover:text-blue-800"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden bg-transparent">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white bg-opacity-70">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Category</th>
                  </tr>
                </thead>
                <tbody className="bg-white bg-opacity-50 divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item._id} className="transition-colors hover:bg-white hover:bg-opacity-70">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.item.itemImages ? (
                            <img className="object-cover w-10 h-10 mr-3 rounded-full" src={`https://pos.inspiredgrow.in/vps/uploads/qr/items/${item.item.itemImages[0]}`} alt={item.item.itemName} />
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 mr-3 bg-gray-200 rounded-full">
                              <FiImage className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{item.item.itemName}</div>
                            <div className="text-sm text-gray-500">{item.item.brand?.brandName || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {item.item.itemCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">Rs.{item.salesPrice}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-gray-500">
                            {item.discountType === 'Percentage' ? `${item.discount}% off` : `$${item.discount} off`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${item.openingStock <= item.alertQuantity ? 'text-red-600' : 'text-green-600'}`}>
                          {item.quantity}
                        </div>
                        
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {item.item.category?.name || 'N/A'}
                      </td>
                     
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemListPage;