import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import CountdownTimer from '../components/CountdownTimer';
import { apiService, FlashSale, Product } from '../services/api';

interface FlashSaleFormData {
  productId: string;
  startTime: string;
  endTime: string;
  stock: number;
}

export default function FlashSaleManagement() {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null);
  const [formData, setFormData] = useState<FlashSaleFormData>({
    productId: '',
    startTime: '',
    endTime: '',
    stock: 0
  });
  const [formLoading, setFormLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    Promise.all([fetchFlashSales(), fetchProducts()]);
  }, [statusFilter]);

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      
      const response = await apiService.getAdminFlashSales(params);
      if (response.data.success) {
        setFlashSales(response.data.flashSales);
      }
    } catch (err: any) {
      setError('Failed to load flash sales');
      console.error('Error fetching flash sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiService.getProducts();
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      startTime: '',
      endTime: '',
      stock: 0
    });
    setEditingSale(null);
  };

  const handleOpenModal = (sale?: FlashSale) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({
        productId: sale.productId._id,
        startTime: new Date(sale.startTime).toISOString().slice(0, 16),
        endTime: new Date(sale.endTime).toISOString().slice(0, 16),
        stock: sale.stock
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const submitData = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString()
      };

      if (editingSale) {
        await apiService.updateFlashSale(editingSale._id, submitData);
      } else {
        await apiService.createFlashSale(submitData);
      }

      handleCloseModal();
      fetchFlashSales();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save flash sale');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (saleId: string) => {
    if (!window.confirm('Are you sure you want to delete this flash sale?')) return;

    try {
      await apiService.deleteFlashSale(saleId);
      fetchFlashSales();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete flash sale');
    }
  };

  const getStatusBadge = (sale: FlashSale) => {
    const now = new Date();
    const startTime = new Date(sale.startTime);
    const endTime = new Date(sale.endTime);

    let status: string;
    let colorClass: string;

    if (now < startTime) {
      status = 'Upcoming';
      colorClass = 'bg-blue-100 text-blue-800';
    } else if (now > endTime) {
      status = 'Ended';
      colorClass = 'bg-gray-100 text-gray-800';
    } else {
      status = 'Active';
      colorClass = 'bg-green-100 text-green-800';
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
        {status}
      </span>
    );
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p._id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <AdminLayout title="Flash Sale Management">
      {/* Header */}
      <div className="sm:flex sm:items-center mb-6">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Flash Sales</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create and manage time-limited sales events.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Create Flash Sale
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">All Status</option>
          <option value="upcoming">Upcoming</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Flash Sales Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Schedule
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Remaining
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
            ) : flashSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No flash sales found
                </td>
              </tr>
            ) : (
              flashSales.map((sale) => (
                <tr key={sale._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {sale.productId.imageUrl && (
                        <div className="h-10 w-10 flex-shrink-0">
                          <img 
                            className="h-10 w-10 rounded-full object-cover" 
                            src={sale.productId.imageUrl} 
                            alt={sale.productId.name}
                          />
                        </div>
                      )}
                      <div className={sale.productId.imageUrl ? "ml-4" : ""}>
                        <div className="text-sm font-medium text-gray-900">
                          {sale.productId.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ${sale.productId.salePrice || sale.productId.price}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Start: {formatDateTime(sale.startTime)}</div>
                      <div>End: {formatDateTime(sale.endTime)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(sale)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.status === 'active' && sale.timeRemaining ? (
                      <CountdownTimer 
                        endTime={sale.endTime}
                        size="small"
                        showLabels={false}
                      />
                    ) : sale.status === 'upcoming' && sale.timeUntilStart ? (
                      <div className="text-blue-600">
                        Starts in {sale.timeUntilStart.days > 0 && `${sale.timeUntilStart.days}d `}
                        {sale.timeUntilStart.hours}h {sale.timeUntilStart.minutes}m
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(sale)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sale._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingSale ? 'Edit Flash Sale' : 'Create New Flash Sale'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product
                    </label>
                    <select
                      required
                      value={formData.productId}
                      onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} - ${product.price}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Available Stock for Sale
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {formLoading ? 'Saving...' : editingSale ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
