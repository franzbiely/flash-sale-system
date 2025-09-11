import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../services/api';

interface DashboardStats {
  products: {
    total: number;
    inStock: number;
    outOfStock: number;
  };
  flashSales: {
    active: number;
    upcoming: number;
    ended: number;
  };
  customers: {
    total: number;
    recentSignups: number;
  };
  purchases: {
    total: number;
    verified: number;
    pending: number;
    revenue: number;
  };
  queue: {
    waiting: number;
    processing: number;
    failed: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          productsResponse,
          flashSalesResponse,
          customersResponse,
          purchasesResponse,
          queueResponse,
          recentPurchasesResponse
        ] = await Promise.all([
          apiService.getProducts({ limit: 1 }),
          apiService.getFlashSaleSummary(),
          apiService.getCustomers({ limit: 1 }),
          apiService.getAllPurchases({ limit: 1 }),
          apiService.getQueueStats(),
          apiService.getAllPurchases({ limit: 5 })
        ]);

        // Mock dashboard stats (you may need to enhance the API to provide better stats)
        const dashboardStats: DashboardStats = {
          products: {
            total: 0, // Will be populated from API response
            inStock: 0,
            outOfStock: 0
          },
          flashSales: {
            active: flashSalesResponse.data.summary?.counts?.active || 0,
            upcoming: flashSalesResponse.data.summary?.counts?.upcoming || 0,
            ended: flashSalesResponse.data.summary?.counts?.ended || 0
          },
          customers: {
            total: 0, // Will be populated from API response
            recentSignups: 0
          },
          purchases: {
            total: purchasesResponse.data.summary?.totalPurchases || 0,
            verified: purchasesResponse.data.summary?.verifiedPurchases || 0,
            pending: purchasesResponse.data.summary?.pendingPurchases || 0,
            revenue: purchasesResponse.data.summary?.totalRevenue || 0
          },
          queue: {
            waiting: queueResponse.data.queueStats?.waiting || 0,
            processing: queueResponse.data.queueStats?.processing || 0,
            failed: queueResponse.data.queueStats?.failed || 0
          }
        };

        setStats(dashboardStats);
        setRecentPurchases(recentPurchasesResponse.data.purchases || []);
      } catch (err: any) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      name: 'Add Product',
      description: 'Create a new product',
      href: '/admin/products',
      icon: '📦',
      color: 'bg-blue-500'
    },
    {
      name: 'Create Flash Sale',
      description: 'Start a new flash sale',
      href: '/admin/flash-sales',
      icon: '⚡',
      color: 'bg-yellow-500'
    },
    {
      name: 'View Customers',
      description: 'Manage customer accounts',
      href: '/admin/customers',
      icon: '👥',
      color: 'bg-green-500'
    },
    {
      name: 'Purchase Reports',
      description: 'View sales analytics',
      href: '/admin/purchases',
      icon: '📊',
      color: 'bg-purple-500'
    }
  ];

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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="text-center py-12">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Flash Sale Admin</h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's what's happening with your flash sales today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Flash Sales Stats */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">⚡</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Sales</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.flashSales.active}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/flash-sales" className="font-medium text-blue-700 hover:text-blue-900">
                View all sales
              </Link>
            </div>
          </div>
        </div>

        {/* Products Stats */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">📦</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.products.total}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/products" className="font-medium text-blue-700 hover:text-blue-900">
                Manage products
              </Link>
            </div>
          </div>
        </div>

        {/* Customers Stats */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-2xl">👥</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.customers.total}</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/customers" className="font-medium text-blue-700 hover:text-blue-900">
                View customers
              </Link>
            </div>
          </div>
        </div>

        {/* Revenue Stats */}
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
                    {formatCurrency(stats?.purchases.revenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link to="/admin/purchases" className="font-medium text-blue-700 hover:text-blue-900">
                View analytics
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div>
                <span className={`rounded-lg inline-flex p-3 ${action.color} text-white`}>
                  <span className="text-xl">{action.icon}</span>
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-900">
                  <span className="absolute inset-0" />
                  {action.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Purchases */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Purchases
            </h3>
            {recentPurchases.length === 0 ? (
              <p className="text-sm text-gray-500">No recent purchases</p>
            ) : (
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentPurchases.slice(0, 5).map((purchase) => (
                    <li key={purchase._id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {purchase.customerEmail}
                          </p>
                          <p className="text-sm text-gray-500">
                            {purchase.productId?.name || 'Product'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            purchase.verified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {purchase.verified ? 'Verified' : 'Pending'}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(purchase.createdAt)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6">
              <Link
                to="/admin/purchases"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View all purchases
              </Link>
            </div>
          </div>
        </div>

        {/* Flash Sale Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Flash Sale Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Active Sales</span>
                <span className="text-sm font-bold text-green-600">
                  {stats?.flashSales.active}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Upcoming Sales</span>
                <span className="text-sm font-bold text-blue-600">
                  {stats?.flashSales.upcoming}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-500">Ended Sales</span>
                <span className="text-sm font-bold text-gray-600">
                  {stats?.flashSales.ended}
                </span>
              </div>
              {stats?.queue && (
                <>
                  <hr className="my-4" />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-500">Queue Status</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Waiting</span>
                    <span className="text-xs text-orange-600">{stats.queue.waiting}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Processing</span>
                    <span className="text-xs text-blue-600">{stats.queue.processing}</span>
                  </div>
                </>
              )}
            </div>
            <div className="mt-6">
              <Link
                to="/admin/flash-sales"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage flash sales
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
