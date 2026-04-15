const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL에서 goodsNo 추출
const extractGoodsNo = (url: string): string => {
  try {
    const decoded = decodeURIComponent(url);
    const parsed = new URL(decoded);
    return parsed.searchParams.get('goodsNo') || '';
  } catch {
    const m = url.match(/goodsNo=([A-Z0-9]+)/i);
    return m ? m[1] : '';
  }
};

// 쿠팡 URL 정규화
const normalizeCoupangUrl = (url: string): string => {
  try {
    const decoded = decodeURIComponent(url);
    const parsed = new URL(decoded);
    if (parsed.pathname.includes('/vp/products/')) {
      const itemId = parsed.searchParams.get('itemId');
      const vendorItemId = parsed.searchParams.get('vendorItemId');
      const base = `https://www.coupang.com${parsed.pathname}`;
      if (itemId && vendorItemId) return `${base}?itemId=${itemId}&vendorItemId=${vendorItemId}`;
      return base;
    }
    return `https://www.coupang.com${parsed.pathname}`;
  } catch {
    return url;
  }
};

// 쿠팡 HTML 파싱
const parseCoupang = (html: string, url: string) => {
  const nameMatch = html.match(/<h2[^>]*class="[^"]*prod-buy-header__title[^"]*"[^>]*>\s*([^<]+)/);
  const productName = nameMatch ? nameMatch[1].trim() : '';

  const brandMatch = html.match(/class="[^"]*brand[^"]*"[^>]*>\s*<[^>]*>\s*([^<]+)/i);
  const productBrand = brandMatch ? brandMatch[1].trim() : '';

  const priceMatch = html.match(/class="[^"]*total-price[^"]*"[^>]*>\s*<strong>\s*([\d,]+)/);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;

  let ingredientsText = '';
  const infoMatch = html.match(/전성분[\s\S]{0,50}?<[^>]+>([\s\S]{30,800}?)<\/t[dr]/i);
  if (infoMatch) ingredientsText = infoMatch[1].replace(/<[^>]+>/g, '').trim();
  if (!ingredientsText) {
    const waterMatch = html.match(/(정제수[^<]{30,})/);
    if (waterMatch) ingredientsText = waterMatch[1].trim();
  }

  const idMatch = url.match(/products\/(\d+)/);
  const productId = idMatch ? idMatch[1] : '';
  const productUrl = `https://www.coupang.com/vp/products/${productId}`;

  const thumbMatch = html.match(/<img[^>]*id="repImage"[^>]*src="([^"]+)"/);
  const imageUrl = thumbMatch ? thumbMatch[1] : '';

  return { productName, productBrand, price, ingredientsText, productUrl, imageUrl, source: 'coupang' as const };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isCoupang = url.includes('coupang.com') || url.includes('link.coupang.com');
    const isOliveYoung = url.includes('oliveyoung.co.kr');
    const isOyShort = url.includes('oy.run');

    if (!isCoupang && !isOliveYoung && !isOyShort) {
      return new Response(
        JSON.stringify({ error: '쿠팡 또는 올리브영 URL만 지원합니다.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 올리브영 직접 URL — HTML 스크래핑 없이 goodsNo만 추출 후 즉시 반환
    // (올리브영은 서버 IP 403 차단 → AI가 상품명으로 직접 분석)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isOliveYoung) {
      const goodsNo = extractGoodsNo(url);
      if (!goodsNo) {
        return new Response(
          JSON.stringify({ error: '올리브영 상품 상세 페이지 URL인지 확인해주세요. (goodsNo 파라미터가 필요합니다)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          productName: '',
          productBrand: '',
          ingredientsText: '',
          productUrl: `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`,
          imageUrl: '',
          source: 'oliveyoung',
          goodsNo,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // oy.run 단축 URL — og태그에서 상품명 추출 후 반환
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (isOyShort) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9',
          },
        });
        const html = await res.text();

        const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/);
        const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
        const rawTitle = ogTitleMatch ? ogTitleMatch[1] : '';
        const productName = rawTitle.replace(/\s*\|\s*올리브영\s*$/, '').trim();
        const imageUrl = ogImageMatch ? ogImageMatch[1] : '';

        let productUrl = '';
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
          try {
            const nextData = JSON.parse(nextDataMatch[1]);
            productUrl = nextData?.props?.pageProps?.targetUrl || '';
          } catch { /* ignore */ }
        }

        const goodsNoMatch = productUrl.match(/goodsNo=([A-Z0-9]+)/i);
        const goodsNo = goodsNoMatch ? goodsNoMatch[1] : '';

        return new Response(
          JSON.stringify({
            productName: productName || '',
            productBrand: '',
            ingredientsText: '',
            productUrl: productUrl || url,
            imageUrl,
            source: 'oliveyoung',
            goodsNo,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ error: `oy.run 링크 처리 실패: ${e instanceof Error ? e.message : '오류'}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 쿠팡 URL — HTML 파싱 시도 (차단 시 productId만 반환)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let resolvedUrl = normalizeCoupangUrl(url);

    // 쿠팡 단축/파트너스 URL 리다이렉트 추적
    if (url.includes('link.coupang.com') || url.includes('coupang.com/p/')) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
        });
        resolvedUrl = normalizeCoupangUrl(res.url);
      } catch {
        resolvedUrl = normalizeCoupangUrl(url);
      }
    }

    if (!resolvedUrl.includes('coupang.com')) {
      return new Response(
        JSON.stringify({ error: '쿠팡 상품 페이지 URL인지 확인해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const html = await fetch(resolvedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://www.coupang.com/',
        },
      }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      });

      const result = parseCoupang(html, resolvedUrl);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      // 쿠팡 차단 시 — 상품 ID만 반환, AI가 분석
      const idMatch = resolvedUrl.match(/products\/(\d+)/);
      const productId = idMatch ? idMatch[1] : '';
      return new Response(
        JSON.stringify({
          productName: '',
          productBrand: '',
          ingredientsText: '',
          productUrl: productId ? `https://www.coupang.com/vp/products/${productId}` : resolvedUrl,
          imageUrl: '',
          source: 'coupang',
          productId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : '오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
