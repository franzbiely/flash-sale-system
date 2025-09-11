// Debug utility for purchase flow
export const debugPurchase = {
  logPurchaseData: (data: any) => {
    console.group('🔍 Purchase Debug Data');
    console.log('Raw response:', data);
    
    if (data.data?.recentPurchases?.length > 0) {
      console.log('Recent purchases found:', data.data.recentPurchases.length);
      data.data.recentPurchases.forEach((purchase: any, index: number) => {
        console.log(`Purchase ${index + 1}:`, {
          saleId: purchase.saleId,
          saleIdType: typeof purchase.saleId,
          saleIdString: String(purchase.saleId),
          verified: purchase.verified,
          timestamp: purchase.timestamp,
          productName: purchase.productId?.name
        });
      });
    } else {
      console.log('No recent purchases found');
    }
    console.groupEnd();
  },

  compareSaleIds: (purchaseSaleId: any, currentSaleId: any) => {
    console.group('🆔 Sale ID Comparison');
    console.log('Purchase Sale ID:', {
      raw: purchaseSaleId,
      type: typeof purchaseSaleId,
      string: String(purchaseSaleId),
      isObject: typeof purchaseSaleId === 'object',
      hasId: purchaseSaleId?._id
    });
    console.log('Current Sale ID:', {
      raw: currentSaleId,
      type: typeof currentSaleId,
      string: String(currentSaleId)
    });
    
    const purchaseIdStr = String(purchaseSaleId?._id || purchaseSaleId);
    const currentIdStr = String(currentSaleId);
    const matches = purchaseIdStr === currentIdStr;
    
    console.log('Comparison Result:', {
      purchaseIdStr,
      currentIdStr,
      matches,
      strictEqual: purchaseSaleId === currentSaleId,
      looseEqual: purchaseSaleId == currentSaleId
    });
    console.groupEnd();
    
    return matches;
  }
};

// Add to window for debugging in dev tools
if (typeof window !== 'undefined') {
  (window as any).debugPurchase = debugPurchase;
}
