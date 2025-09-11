import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../services/api';

interface Purchase {
  _id: string;
  customerEmail: string;
  productId: {
    _id: string;
    name: string;
    price: number;
    salePrice?: number;
  };
  verified: boolean;
  createdAt: string;
  status: string;
  amount: number;
}

interface PurchaseAnalytics {
  totalRevenue: number;
  totalPurchases: number;
  verifiedPurchases: number;
  pendingPurchases: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    sales: number;
    revenue: number;
  }>;
}

export default function PurchasesOverview() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [analytics, setAnalytics] = useState<PurchaseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    verified: undefined as boolean | undefined,
    startDate: '',
    endDate: '',
    days: 30
  });
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    Promise.all([fetchPurchases(), fetchAnalytics()]);
  }, [filters]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 20 };
      
      if (filters.verified !== undefined) params.verified = filters.verified;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      
      const response = await apiService.getAllPurchases(params);
      if (response.data.success) {
        setPurchases(response.data.purchases);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError('Failed to load purchases');
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await apiService.getPurchaseAnalytics({ days: filters.days });
      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDefaultDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  };

  const handleQuickFilter = (days: number) => {
    const dateRange = getDefaultDateRange(days);
    setFilters(prev => ({
      ...prev,
      days,
      startDate: dateRange.start,
      endDate: dateRange.end
    }));
  };

  return (
    <AdminLayout title="Purchases Overview">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Purchases & Analytics</h1>
        <p className="mt-2 text-sm text-gray-700">
          Monitor sales performance and customer purchase patterns.
        </p>
      </div>

      {/* Quick Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleQuickFilter(7)}
          className={`px-3 py-1 text-sm rounded-md ${
            filters.days === 7 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 7 days
        </button>
        <button
          onClick={() => handleQuickFilter(30)}
          className={`px-3 py-1 text-sm rounded-md ${
            filters.days === 30 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 30 days
        </button>
        <button
          onClick={() => handleQuickFilter(90)}
          className={`px-3 py-1 text-sm rounded-md ${
            filters.days === 90 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 90 days
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.verified === undefined ? '' : filters.verified.toString()}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              verified: e.target.value === '' ? undefined : e.target.value === 'true'
            }))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Purchases</option>
            <option value="true">Verified Only</option>
            <option value="false">Pending Only</option>
          </select>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💰</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(analytics.totalRevenue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📊</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.totalPurchases}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">{analytics.verifiedPurchases}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📈</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Order Value</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(analytics.averageOrderValue)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Products */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top Selling Products</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {analytics.topProducts.slice(0, 5).map((product, index) => (
                <li key={product.productId} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-blue-600 mr-4">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.sales} sales
                        </p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Recent Purchases Table */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Purchases</h2>
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No purchases found
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {purchase.customerEmail}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {purchase._id.slice(-8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {purchase.productId?.name || 'Unknown Product'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(
                        purchase.amount || 
                        purchase.productId?.salePrice || 
                        purchase.productId?.price || 
                        0
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        purchase.verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {purchase.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(purchase.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
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
    </AdminLayout>
  );
}
