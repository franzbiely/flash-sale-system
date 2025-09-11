import { useState, useEffect } from 'react';
import { FlashSale, apiService } from '../services/api';
import ProductCard from './ProductCard';
import PurchaseModal from './PurchaseModal';

type TabType = 'active' | 'upcoming' | 'ended';

interface FlashSaleListProps {
  defaultTab?: TabType;
  showTabs?: boolean;
  limit?: number;
  className?: string;
}

export default function FlashSaleList({ 
  defaultTab = 'active', 
  showTabs = true, 
  limit,
  className = '' 
}: FlashSaleListProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<FlashSale | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [userPurchases, setUserPurchases] = useState<Set<string>>(new Set());

  const tabs = [
    { id: 'active' as TabType, name: 'Active Sales', icon: '🔥' },
    { id: 'upcoming' as TabType, name: 'Coming Soon', icon: '⏰' },
    { id: 'ended' as TabType, name: 'Past Sales', icon: '📝' }
  ];

  const fetchSales = async (tab: TabType) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      const params = limit ? { limit } : {};

      switch (tab) {
        case 'active':
          response = await apiService.getActiveFlashSales(params);
          break;
        case 'upcoming':
          response = await apiService.getUpcomingFlashSales(params);
          break;
        case 'ended':
          response = await apiService.getEndedFlashSales(params);
          break;
      }

      if (response.data.success) {
        setSales(response.data.flashSales);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to load flash sales');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load flash sales');
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(activeTab);
    if (activeTab === 'active') {
      checkUserPurchases();
    }
  }, [activeTab, limit]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleBuyNow = (sale: FlashSale) => {
    if (sale.status === 'active' && sale.stock > 0) {
      setSelectedSale(sale);
      setPurchaseModalOpen(true);
    }
  };

  const checkUserPurchases = async () => {
    // Get user email from localStorage or session
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;

    try {
      const response = await apiService.getPurchaseStatus(userEmail);
      if (response.data.success && response.data.data.recentPurchases) {
        const purchasedSaleIds = new Set(
          response.data.data.recentPurchases.map((purchase: any) => purchase.saleId)
        );
        setUserPurchases(purchasedSaleIds);
      }
    } catch (error) {
      console.error('Error checking user purchases:', error);
    }
  };

  const handlePurchaseModalClose = () => {
    setPurchaseModalOpen(false);
    setSelectedSale(null);
    // Refresh active sales to update stock and check purchases
    if (activeTab === 'active') {
      fetchSales('active');
      checkUserPurchases();
    }
  };

  const getEmptyStateContent = () => {
    switch (activeTab) {
      case 'active':
        return {
          icon: '🕐',
          title: 'No Active Sales',
          description: 'Check back soon for amazing deals!'
        };
      case 'upcoming':
        return {
          icon: '📅',
          title: 'No Upcoming Sales',
          description: 'New sales will be announced soon!'
        };
      case 'ended':
        return {
          icon: '📝',
          title: 'No Past Sales',
          description: 'Previous sales will appear here.'
        };
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        {showTabs && (
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="py-2 px-1 border-b-2 border-transparent text-gray-500"
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </div>
              ))}
            </nav>
          </div>
        )}
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Sales</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchSales(activeTab)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const emptyState = getEmptyStateContent();

  return (
    <div className={`${className}`}>
      {/* Tabs */}
      {showTabs && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Content */}
      {sales.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">{emptyState.icon}</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{emptyState.title}</h3>
          <p className="text-gray-600">{emptyState.description}</p>
        </div>
      ) : (
        <>
          {/* Sales Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sales.map((sale) => (
              <ProductCard
                key={sale._id}
                sale={sale}
                onBuyNow={handleBuyNow}
                showCountdown={activeTab === 'active'}
                alreadyPurchased={userPurchases.has(sale._id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                {pagination.totalItems} results
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
                  {pagination.currentPage}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={purchaseModalOpen}
        onClose={handlePurchaseModalClose}
        sale={selectedSale}
      />
    </div>
  );
}
