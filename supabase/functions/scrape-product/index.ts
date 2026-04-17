/**
 * scrape-product: 제품 URL → 이름/브랜드/이미지 URL 추출
 *
 * 지원 소스
 *  - 쿠팡(coupang.com): 상품명·브랜드·가격·이미지
 *  - 올리브영 단축 URL(oy.run): og 태그로 이름/이미지
 *  - 올리브영 직접 URL(oliveyoung.co.kr): goodsNo만 추출(서버 IP 차단)
 *  - 기타 일반 쇼핑몰: OpenGraph(og:image / og:title / og:site_name)로 fallback
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeResult {
  productName: string;
  productBrand: string;
  ingredientsText: string;
  productUrl: string;
  imageUrl: string;
  source: 'coupang' | 'oliveyoung' | 'opengraph' | 'unknown';
  goodsNo?: string;
  productId?: string;
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';

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

const parseCoupang = (html: string, url: string): ScrapeResult => {
  const nameMatch = html.match(/<h2[^>]*class="[^"]*prod-buy-header__title[^"]*"[^>]*>\s*([^<]+)/);
  const productName = nameMatch ? nameMatch[1].trim() : '';

  const brandMatch = html.match(/class="[^"]*brand[^"]*"[^>]*>\s*<[^>]*>\s*([^<]+)/i);
  const productBrand = brandMatch ? brandMatch[1].trim() : '';

  const thumbMatch = html.match(/<img[^>]*id="repImage"[^>]*src="([^"]+)"/);
  let imageUrl = thumbMatch ? thumbMatch[1] : '';
  if (imageUrl && imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;

  const idMatch = url.match(/products\/(\d+)/);
  const productId = idMatch ? idMatch[1] : '';
  const productUrl = `https://www.coupang.com/vp/products/${productId}`;

  return {
    productName,
    productBrand,
    ingredientsText: '',
    productUrl,
    imageUrl,
    source: 'coupang',
    productId,
  };
};

const parseOpenGraph = (html: string, url: string): ScrapeResult => {
  const meta = (p: string) => {
    const re = new RegExp(`<meta[^>]*(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)["']`, 'i');
    const m = html.match(re);
    if (m) return m[1];
    const re2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, 'i');
    const m2 = html.match(re2);
    return m2 ? m2[1] : '';
  };

  let imageUrl = meta('og:image') || meta('twitter:image') || '';
  if (imageUrl && imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
  if (imageUrl && imageUrl.startsWith('/')) {
    try {
      const u = new URL(url);
      imageUrl = `${u.origin}${imageUrl}`;
    } catch { /* ignore */ }
  }

  const rawTitle = meta('og:title') || meta('twitter:title') || '';
  const siteName = meta('og:site_name') || '';

  // "브랜드 상품명 | 사이트명" 패턴에서 사이트명 제거
  let productName = rawTitle;
  productName = productName.replace(/\s*[\|–—-]\s*[^|]*$/, '').trim();
  if (siteName && productName.endsWith(siteName)) {
    productName = productName.slice(0, -siteName.length).trim();
  }

  return {
    productName,
    productBrand: '',
    ingredientsText: '',
    productUrl: url,
    imageUrl,
    source: 'opengraph',
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // URL 검증
    try {
      new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: '유효한 URL이 아니에요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const isCoupang = url.includes('coupang.com') || url.includes('link.coupang.com');
    const isOliveYoungDirect = url.includes('oliveyoung.co.kr');
    const isOyShort = url.includes('oy.run');

    // 올리브영 직접 URL — goodsNo만 반환
    if (isOliveYoungDirect) {
      const goodsNo = extractGoodsNo(url);
      if (!goodsNo) {
        return new Response(
          JSON.stringify({ error: '올리브영 상품 상세 페이지 URL인지 확인해주세요.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
        } satisfies ScrapeResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 올리브영 단축 URL — og 태그로 파싱
    if (isOyShort) {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ko-KR,ko;q=0.9' },
      });
      const html = await res.text();
      const og = parseOpenGraph(html, url);
      og.productName = og.productName.replace(/\s*\|\s*올리브영\s*$/, '').trim();
      og.source = 'oliveyoung';

      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const target = nextData?.props?.pageProps?.targetUrl || '';
          if (target) {
            og.productUrl = target;
            const goodsNoMatch = target.match(/goodsNo=([A-Z0-9]+)/i);
            if (goodsNoMatch) og.goodsNo = goodsNoMatch[1];
          }
        } catch { /* ignore */ }
      }

      return new Response(
        JSON.stringify(og),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 쿠팡 URL
    if (isCoupang) {
      let resolvedUrl = normalizeCoupangUrl(url);
      if (url.includes('link.coupang.com') || url.includes('coupang.com/p/')) {
        try {
          const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': UA } });
          resolvedUrl = normalizeCoupangUrl(res.url);
        } catch { /* ignore */ }
      }

      try {
        const html = await fetch(resolvedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': 'https://www.coupang.com/',
          },
        }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); });

        // 쿠팡 전용 파서 실패 시 OG fallback
        const coupangRes = parseCoupang(html, resolvedUrl);
        if (!coupangRes.productName || !coupangRes.imageUrl) {
          const og = parseOpenGraph(html, resolvedUrl);
          coupangRes.productName = coupangRes.productName || og.productName;
          coupangRes.imageUrl = coupangRes.imageUrl || og.imageUrl;
        }
        return new Response(
          JSON.stringify(coupangRes),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      } catch {
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
          } satisfies ScrapeResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // 일반 URL — OpenGraph fallback
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const og = parseOpenGraph(html, res.url || url);
      return new Response(
        JSON.stringify(og),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: `상품 페이지를 불러오지 못했어요: ${err instanceof Error ? err.message : '오류'}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
  } catch (err) {
    console.error('[scrape-product] error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : '오류가 발생했습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
