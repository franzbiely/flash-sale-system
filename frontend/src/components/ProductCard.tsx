import CountdownTimer from './CountdownTimer';
import { FlashSale } from '../services/api';

interface ProductCardProps {
  sale: FlashSale;
  onBuyNow: (sale: FlashSale) => void;
  showCountdown?: boolean;
  size?: 'compact' | 'standard' | 'featured';
  className?: string;
  userEmail?: string;
  alreadyPurchased?: boolean;
}

export default function ProductCard({ 
  sale, 
  onBuyNow, 
  showCountdown = true, 
  size = 'standard',
  className = '',
  userEmail,
  alreadyPurchased = false
}: ProductCardProps) {
  const { productId: product, stock, status } = sale;

  const getSizeClasses = () => {
    switch (size) {
      case 'compact':
        return {
          container: 'max-w-sm',
          image: 'h-32',
          title: 'text-sm font-medium',
          price: 'text-lg',
          originalPrice: 'text-sm',
          button: 'px-3 py-1.5 text-sm'
        };
      case 'featured':
        return {
          container: 'max-w-lg',
          image: 'h-64',
          title: 'text-xl font-semibold',
          price: 'text-3xl',
          originalPrice: 'text-lg',
          button: 'px-6 py-3 text-lg'
        };
      default:
        return {
          container: 'max-w-md',
          image: 'h-48',
          title: 'text-lg font-semibold',
          price: 'text-2xl',
          originalPrice: 'text-base',
          button: 'px-4 py-2 text-base'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const calculateDiscount = () => {
    if (!product.salePrice || !product.price) return null;
    const discount = Math.round(((product.price - product.salePrice) / product.price) * 100);
    return discount > 0 ? discount : null;
  };

  const getStockStatus = () => {
    if (stock === 0) return { text: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= 5) return { text: `Only ${stock} left!`, color: 'bg-orange-100 text-orange-800' };
    if (stock <= 20) return { text: `${stock} available`, color: 'bg-yellow-100 text-yellow-800' };
    return { text: `${stock} in stock`, color: 'bg-green-100 text-green-800' };
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'upcoming':
        return { text: 'Coming Soon', color: 'bg-blue-100 text-blue-800' };
      case 'active':
        return { text: 'Live Now', color: 'bg-green-100 text-green-800' };
      case 'ended':
        return { text: 'Ended', color: 'bg-gray-100 text-gray-800' };
      default:
        return null;
    }
  };

  const discount = calculateDiscount();
  const stockStatus = getStockStatus();
  const statusBadge = getStatusBadge();
  const isOutOfStock = stock === 0;
  const canPurchase = status === 'active' && !isOutOfStock && !alreadyPurchased;

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${sizeClasses.container} ${className}`}>
      {/* Product Image */}
      <div className="relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className={`w-full ${sizeClasses.image} object-cover`}
          />
        ) : (
          <div className={`w-full ${sizeClasses.image} bg-gray-200 flex items-center justify-center`}>
            <div className="text-gray-400 text-center">
              <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">No Image</span>
            </div>
          </div>
        )}
        
        {/* Status Badge */}
        {statusBadge && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
            {statusBadge.text}
          </div>
        )}
        
        {/* Discount Badge */}
        {discount && status === 'active' && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            -{discount}%
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4">
        {/* Product Name */}
        <h3 className={`${sizeClasses.title} text-gray-900 mb-2 line-clamp-2`}>
          {product.name}
        </h3>

        {/* Pricing */}
        <div className="flex items-baseline space-x-2 mb-3">
          {product.salePrice && status === 'active' ? (
            <>
              <span className={`${sizeClasses.price} font-bold text-red-600`}>
                ${product.salePrice.toFixed(2)}
              </span>
              <span className={`${sizeClasses.originalPrice} text-gray-500 line-through`}>
                ${product.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className={`${sizeClasses.price} font-bold text-gray-900`}>
              ${product.price.toFixed(2)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${stockStatus.color}`}>
            {stockStatus.text}
          </span>
        </div>

        {/* Countdown Timer */}
        {showCountdown && status === 'active' && sale.timeRemaining && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Sale ends in:</span>
            </div>
            <CountdownTimer 
              endTime={sale.endTime}
              size={size === 'featured' ? 'medium' : 'small'}
              showLabels={size === 'featured'}
            />
          </div>
        )}

        {/* Time Until Start for Upcoming Sales */}
        {status === 'upcoming' && sale.timeUntilStart && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Starts in:</div>
            <div className="text-blue-600 font-semibold">
              {sale.timeUntilStart.days > 0 && `${sale.timeUntilStart.days}d `}
              {sale.timeUntilStart.hours}h {sale.timeUntilStart.minutes}m
            </div>
          </div>
        )}

        {/* Buy Now Button */}
        <button
          onClick={() => onBuyNow(sale)}
          disabled={!canPurchase}
          className={`w-full font-medium rounded-md transition-colors duration-200 ${sizeClasses.button} ${
            canPurchase
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : alreadyPurchased
              ? 'bg-green-100 text-green-700 cursor-not-allowed'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {status === 'upcoming' ? 'Coming Soon' : 
           status === 'ended' ? 'Sale Ended' :
           alreadyPurchased ? 'Already Purchased' :
           isOutOfStock ? 'Out of Stock' : 
           'Buy Now'}
        </button>
      </div>
    </div>
  );
}
