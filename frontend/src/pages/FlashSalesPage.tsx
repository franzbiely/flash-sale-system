import FlashSaleList from '../components/FlashSaleList';

export default function FlashSalesPage() {

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">⚡ Flash Sales</h1>
          <p className="mt-4 text-lg text-gray-600">
            Discover amazing deals with limited-time offers
          </p>
        </div>

        <FlashSaleList />
      </div>
    </div>
  );
}
