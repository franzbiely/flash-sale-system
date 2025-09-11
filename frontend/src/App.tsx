import { Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import HomePage from './pages/HomePage'
import FlashSalesPage from './pages/FlashSalesPage'
import AdminPage from './pages/AdminPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ProductManagement from './pages/ProductManagement'
import FlashSaleManagement from './pages/FlashSaleManagement'
import CustomerManagement from './pages/CustomerManagement'
import PurchasesOverview from './pages/PurchasesOverview'
import NotFound from './pages/NotFound'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<><Navigation /><HomePage /></>} />
        <Route path="/flash-sales" element={<><Navigation /><FlashSalesPage /></>} />
        <Route path="/admin" element={<><Navigation /><AdminPage /></>} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/products" element={<ProductManagement />} />
        <Route path="/admin/flash-sales" element={<FlashSaleManagement />} />
        <Route path="/admin/customers" element={<CustomerManagement />} />
        <Route path="/admin/purchases" element={<PurchasesOverview />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  )
}

export default App
