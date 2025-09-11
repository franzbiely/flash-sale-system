import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService, FlashSale } from '../services/api';

export default function HomePage() {
  const [activeSales, setActiveSales] = useState<FlashSale[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeResponse, summaryResponse] = await Promise.all([
          apiService.getActiveFlashSales({ limit: 6 }),
          apiService.getFlashSaleSummary()
        ]);

        setActiveSales(activeResponse.data.flashSales);
        setSummary(summaryResponse.data.summary);
      } catch (err) {
        setError('Failed to load flash sales');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatTimeRemaining = (timeRemaining?: { hours: number; minutes: number }) => {
    if (!timeRemaining) return '';
    const { hours, minutes } = timeRemaining;
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
              ⚡ Flash Sales
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Lightning-fast deals on amazing products. Limited time, limited stock!
            </p>
            {summary && (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-lg mx-auto">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold">{summary.counts.active}</div>
                  <div className="text-sm opacity-90">Active Sales</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold">{summary.counts.upcoming}</div>
                  <div className="text-sm opacity-90">Coming Soon</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-2xl font-bold">{summary.counts.ended}</div>
                  <div className="text-sm opacity-90">Past Sales</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Flash Sales */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">⚡ Active Flash Sales</h2>
          <p className="mt-4 text-lg text-gray-600">
            Grab these deals before they're gone!
          </p>
        </div>

        {activeSales.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🕐</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Sales</h3>
            <p className="text-gray-600 mb-6">Check back soon for amazing deals!</p>
            <Link 
              to="/flash-sales" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
            >
              View Upcoming Sales
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeSales.map((sale) => (
                <div key={sale._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {sale.productId.imageUrl && (
                    <img 
                      src={sale.productId.imageUrl} 
                      alt={sale.productId.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {sale.productId.name}
                    </h3>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        {sale.productId.salePrice && (
                          <span className="text-2xl font-bold text-red-600">
                            ${sale.productId.salePrice}
                          </span>
                        )}
                        <span className={`${sale.productId.salePrice ? 'text-sm text-gray-500 line-through' : 'text-2xl font-bold text-gray-900'}`}>
                          ${sale.productId.price}
                        </span>
                      </div>
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {sale.stock} left
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        ⏰ {formatTimeRemaining(sale.timeRemaining)}
                      </span>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link 
                to="/flash-sales" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
              >
                View All Flash Sales
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Next Upcoming Sale */}
      {summary?.nextUpcoming && (
        <div className="bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">🔥 Next Big Sale</h3>
                <h4 className="text-xl font-semibold text-gray-800 mb-2">
                  {summary.nextUpcoming.productId.name}
                </h4>
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  ${summary.nextUpcoming.productId.salePrice || summary.nextUpcoming.productId.price}
                </div>
                <div className="text-gray-600">
                  Starts in {summary.nextUpcoming.timeUntilStart.days}d {summary.nextUpcoming.timeUntilStart.hours}h {summary.nextUpcoming.timeUntilStart.minutes}m
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
