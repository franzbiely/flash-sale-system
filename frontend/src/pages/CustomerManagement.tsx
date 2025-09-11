import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService } from '../services/api';

interface Customer {
  _id: string;
  email: string;
  createdAt: string;
  lastPurchase?: string;
  totalPurchases: number;
  totalSpent: number;
  isActive: boolean;
}

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

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPurchases, setCustomerPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await apiService.getCustomers(params);
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (err: any) {
      setError('Failed to load customers');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerPurchases = async (customerId: string) => {
    try {
      setPurchasesLoading(true);
      const response = await apiService.getAllPurchases({ 
        limit: 50 // Get more for customer history
      });
      
      if (response.data.success) {
        // Filter purchases for the specific customer
        const customer = customers.find(c => c._id === customerId);
        if (customer) {
          const filteredPurchases = response.data.purchases.filter(
            (purchase: Purchase) => purchase.customerEmail === customer.email
          );
          setCustomerPurchases(filteredPurchases);
        }
      }
    } catch (err: any) {
      console.error('Error fetching customer purchases:', err);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const handleViewCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowPurchaseModal(true);
    await fetchCustomerPurchases(customer._id);
  };

  const handleCloseModal = () => {
    setShowPurchaseModal(false);
    setSelectedCustomer(null);
    setCustomerPurchases([]);
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

  const getCustomerStatus = (customer: Customer) => {
    const lastPurchaseDate = customer.lastPurchase ? new Date(customer.lastPurchase) : null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (!lastPurchaseDate) {
      return { text: 'New', color: 'bg-blue-100 text-blue-800' };
    }

    if (lastPurchaseDate > thirtyDaysAgo) {
      return { text: 'Active', color: 'bg-green-100 text-green-800' };
    }

    return { text: 'Inactive', color: 'bg-gray-100 text-gray-800' };
  };

  const filteredCustomers = customers.filter(customer =>
    !searchTerm || customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout title="Customer Management">
      {/* Header */}
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-700">
            View and manage customer accounts and purchase history.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search customers by email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Customers Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registration Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchases
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const status = getCustomerStatus(customer);
                return (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {customer._id.slice(-8)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.totalPurchases || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(customer.totalSpent || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewCustomer(customer)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Details Modal */}
      {showPurchaseModal && selectedCustomer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Customer Details
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCustomer.email}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedCustomer.totalPurchases || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Purchases</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedCustomer.totalSpent || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatDate(selectedCustomer.createdAt)}
                  </div>
                  <div className="text-sm text-gray-600">Member Since</div>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Purchase History</h4>
                {purchasesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : customerPurchases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No purchases found
                  </div>
                ) : (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Product
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {customerPurchases.map((purchase) => (
                          <tr key={purchase._id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {purchase.productId?.name || 'Unknown Product'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(purchase.amount || purchase.productId?.salePrice || purchase.productId?.price || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                purchase.verified 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {purchase.verified ? 'Verified' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatDate(purchase.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
