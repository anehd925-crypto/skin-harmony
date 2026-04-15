const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE = 'https://mcp.aka.page/api/oliveyoung';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { productName, locationKeyword } = await req.json();

    if (!productName || !locationKeyword) {
      return new Response(
        JSON.stringify({ error: '상품명과 지역명이 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. 올리브영 상품 검색
    const productRes = await fetch(
      `${BASE}/products?keyword=${encodeURIComponent(productName)}&size=5`
    );
    const productData = await productRes.json();

    if (!productData.success || !productData.data?.products?.length) {
      return new Response(
        JSON.stringify({ error: '올리브영에서 해당 상품을 찾을 수 없습니다.', stores: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const topProduct = productData.data.products[0];

    // 2. 재고 확인 (상품명 + 지역 키워드)
    const inventoryRes = await fetch(
      `${BASE}/inventory?keyword=${encodeURIComponent(productName)}&storeKeyword=${encodeURIComponent(locationKeyword)}&size=5`
    );
    const inventoryData = await inventoryRes.json();

    if (!inventoryData.success) {
      return new Response(
        JSON.stringify({ error: '재고 정보를 가져오지 못했습니다.', stores: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inv = inventoryData.data;

    // 매장 목록 정리
    const stores = (inv.nearbyStores?.stores ?? []).map((s: {
      storeName: string;
      address: string;
      pickupYn: boolean;
      o2oRemainQuantity: number;
    }) => ({
      storeName: s.storeName,
      address: s.address,
      pickupAvailable: s.pickupYn,
      remainQuantity: s.o2oRemainQuantity,
      stockStatus: s.o2oRemainQuantity > 0 ? 'in_stock' : s.pickupYn ? 'limited' : 'unknown',
    }));

    // 상품 후보 (검색 결과 상위 3개)
    const products = productData.data.products.slice(0, 3).map((p: {
      goodsName: string;
      imageUrl: string;
      priceToPay: number;
      inStock: boolean;
    }) => ({
      goodsName: p.goodsName,
      imageUrl: p.imageUrl,
      priceToPay: p.priceToPay,
      inStock: p.inStock,
    }));

    return new Response(
      JSON.stringify({
        topProduct: {
          goodsName: topProduct.goodsName,
          imageUrl: topProduct.imageUrl,
          priceToPay: topProduct.priceToPay,
          inStock: topProduct.inStock,
        },
        products,
        stores,
        totalStores: inv.nearbyStores?.totalCount ?? 0,
        locationKeyword,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `서버 오류: ${(e as Error).message}`, stores: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
