import { useState, useEffect } from 'react';
import { apiService, FlashSale } from '../services/api';

export default function FlashSalesPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'ended'>('active');
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlashSales();
  }, [activeTab]);

  const fetchFlashSales = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      switch (activeTab) {
        case 'active':
          response = await apiService.getActiveFlashSales({ limit: 20 });
          break;
        case 'upcoming':
          response = await apiService.getUpcomingFlashSales({ limit: 20 });
          break;
        case 'ended':
          response = await apiService.getEndedFlashSales({ limit: 20 });
          break;
      }
      setFlashSales(response.data.flashSales);
    } catch (err) {
      setError('Failed to load flash sales');
      console.error('Error fetching flash sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (sale: FlashSale) => {
    switch (activeTab) {
      case 'active':
        if (sale.timeRemaining) {
          const { hours, minutes } = sale.timeRemaining;
          return `${hours}h ${minutes}m left`;
        }
        return '';
      case 'upcoming':
        if (sale.timeUntilStart) {
          const { days, hours, minutes } = sale.timeUntilStart;
          if (days > 0) return `Starts in ${days}d ${hours}h`;
          return `Starts in ${hours}h ${minutes}m`;
        }
        return '';
      case 'ended':
        return 'Ended';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (activeTab) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ended':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">⚡ Flash Sales</h1>
          <p className="mt-4 text-lg text-gray-600">
            Discover amazing deals with limited-time offers
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8 justify-center" aria-label="Tabs">
            {[
              { id: 'active', name: 'Active Sales', icon: '🔥' },
              { id: 'upcoming', name: 'Coming Soon', icon: '⏰' },
              { id: 'ended', name: 'Past Sales', icon: '📋' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'active' | 'upcoming' | 'ended')}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button 
              onClick={fetchFlashSales}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Flash Sales Grid */}
        {!loading && !error && (
          <>
            {flashSales.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {activeTab === 'active' ? '🕐' : activeTab === 'upcoming' ? '⏳' : '📋'}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No {activeTab} flash sales
                </h3>
                <p className="text-gray-600">
                  {activeTab === 'active' && 'Check back soon for new deals!'}
                  {activeTab === 'upcoming' && 'No upcoming sales scheduled yet.'}
                  {activeTab === 'ended' && 'No past sales to display.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {flashSales.map((sale) => (
                  <div key={sale._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    {sale.productId.imageUrl && (
                      <img 
                        src={sale.productId.imageUrl} 
                        alt={sale.productId.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {sale.productId.name}
                        </h3>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${getStatusColor()}`}>
                          {sale.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          {sale.productId.salePrice && (
                            <span className="text-xl font-bold text-red-600">
                              ${sale.productId.salePrice}
                            </span>
                          )}
                          <span className={`${sale.productId.salePrice ? 'text-sm text-gray-500 line-through' : 'text-xl font-bold text-gray-900'}`}>
                            ${sale.productId.price}
                          </span>
                        </div>
                        {activeTab !== 'ended' && (
                          <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            {sale.stock} left
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          {formatTime(sale)}
                        </span>
                        {activeTab === 'active' && (
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                            Buy Now
                          </button>
                        )}
                        {activeTab === 'upcoming' && (
                          <button className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed">
                            Coming Soon
                          </button>
                        )}
                        {activeTab === 'ended' && (
                          <span className="text-sm text-gray-500">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
