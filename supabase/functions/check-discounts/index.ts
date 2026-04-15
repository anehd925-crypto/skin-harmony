const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OLIVEYOUNG_BASE = 'https://mcp.aka.page/api/oliveyoung';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiHeaders = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id가 필요합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 찜 목록 + 제품 정보 조회
    const wishRes = await fetch(
      `${supabaseUrl}/rest/v1/wish_list?select=product_id,products(id,name,oliveyoung_name,original_price,current_price,discount_rate,is_on_sale)&user_id=eq.${user_id}`,
      { headers: apiHeaders }
    );
    const wishes: Array<{
      product_id: string;
      products: {
        id: string;
        name: string;
        oliveyoung_name: string;
        original_price: number;
        current_price: number;
        discount_rate: number;
        is_on_sale: boolean;
      } | null;
    }> = await wishRes.json();

    if (!Array.isArray(wishes) || wishes.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: '찜한 상품이 없습니다.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const wish of wishes) {
      const product = wish.products;
      if (!product?.oliveyoung_name) continue;

      try {
        const oyRes = await fetch(
          `${OLIVEYOUNG_BASE}/products?keyword=${encodeURIComponent(product.oliveyoung_name)}&size=1`
        );
        const oyData = await oyRes.json();
        if (!oyData.success || !oyData.data?.products?.length) continue;

        const oyProduct = oyData.data.products[0];
        const newPrice: number = oyProduct.priceToPay ?? 0;
        const origPrice: number = product.original_price || newPrice;
        if (newPrice <= 0 || origPrice <= 0) continue;

        const newDiscountRate = origPrice > 0
          ? Math.round(((origPrice - newPrice) / origPrice) * 10000) / 100
          : 0;
        const isNowOnSale = newDiscountRate >= 5;
        const wasOnSale = product.is_on_sale;
        const discountChanged = Math.abs(newDiscountRate - (product.discount_rate || 0)) >= 3;

        // products 업데이트
        await fetch(
          `${supabaseUrl}/rest/v1/products?id=eq.${product.id}`,
          {
            method: 'PATCH',
            headers: apiHeaders,
            body: JSON.stringify({
              current_price: newPrice,
              discount_rate: newDiscountRate,
              is_on_sale: isNowOnSale,
            }),
          }
        );

        // discount_alerts 업데이트
        const alertUpdate: Record<string, unknown> = {
          last_price: newPrice,
          last_discount_rate: newDiscountRate,
          last_checked_at: new Date().toISOString(),
        };
        if (isNowOnSale && (!wasOnSale || discountChanged)) {
          alertUpdate.alerted_at = new Date().toISOString();
        }

        await fetch(
          `${supabaseUrl}/rest/v1/discount_alerts?user_id=eq.${user_id}&product_id=eq.${product.id}`,
          {
            method: 'PATCH',
            headers: apiHeaders,
            body: JSON.stringify(alertUpdate),
          }
        );

        results.push({
          product_id: product.id,
          product_name: product.name,
          oliveyoung_name: product.oliveyoung_name,
          original_price: origPrice,
          previous_price: product.current_price,
          new_price: newPrice,
          discount_rate: newDiscountRate,
          was_on_sale: wasOnSale,
          is_on_sale: isNowOnSale,
          discount_changed: discountChanged,
        });
      } catch {
        continue;
      }
    }

    return new Response(
      JSON.stringify({
        results,
        on_sale_count: results.filter(r => r.is_on_sale).length,
        new_discount_count: results.filter(r => r.is_on_sale && (!r.was_on_sale || r.discount_changed)).length,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `서버 오류: ${(e as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
