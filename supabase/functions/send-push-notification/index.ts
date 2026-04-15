/**
 * send-push-notification Edge Function
 *
 * 역할:
 * 1. 모든 사용자의 discount_alerts / price_alerts 를 순회
 * 2. 올리브영 API로 현재 가격 확인
 * 3. 할인 감지 시 push_subscriptions에 등록된 기기로 Web Push 발송
 *
 * 호출:
 * - Supabase pg_cron 스케줄 (매일 09:00 KST)
 * - 수동 테스트: POST /functions/v1/send-push-notification (service role key 필요)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OLIVEYOUNG_BASE = 'https://mcp.aka.page/api/oliveyoung';

// ──────────────────────────────────────────────
// VAPID 서명 유틸리티
// ──────────────────────────────────────────────

function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function buildVapidHeader(
  endpoint: string,
  vapidPublic: string,
  vapidPrivate: string,
  subject: string,
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 12 * 3600; // 12시간 유효

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };

  const encode = (obj: object) =>
    uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(obj)));

  const signingInput = `${encode(header)}.${encode(payload)}`;

  // ECDSA P-256 개인키 import
  const privKeyBytes = base64urlToUint8Array(vapidPrivate.split('AAER')[0]); // raw 32바이트 추출 시도
  
  // pkcs8 DER 포맷으로 래핑
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  
  const rawPriv = base64urlToUint8Array(vapidPrivate).slice(0, 32);
  const pkcs8 = new Uint8Array(pkcs8Header.length + rawPriv.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(rawPriv, pkcs8Header.length);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(signature))}`;
  return `vapid t=${jwt},k=${vapidPublic}`;
}

// ──────────────────────────────────────────────
// Web Push 발송
// ──────────────────────────────────────────────

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  productId?: string;
}

async function sendWebPush(
  sub: PushSubscription,
  payload: PushPayload,
  vapidPublic: string,
  vapidPrivate: string,
  subject: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    // ECDH 키 교환으로 메시지 암호화
    // RFC 8291 (Web Push Message Encryption) 구현

    // 수신자 공개키와 auth secret
    const receiverPublicKey = base64urlToUint8Array(sub.p256dh);
    const authSecret = base64urlToUint8Array(sub.auth);

    // 발신자 ECDH 키쌍 생성
    const senderKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits'],
    );
    const senderPublicKeyRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', senderKeyPair.publicKey),
    );

    // 수신자 공개키 import
    const receiverKey = await crypto.subtle.importKey(
      'raw',
      receiverPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );

    // 공유 비밀 도출
    const sharedBits = new Uint8Array(
      await crypto.subtle.deriveBits(
        { name: 'ECDH', public: receiverKey },
        senderKeyPair.privateKey,
        256,
      ),
    );

    // Salt 생성 (16 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // HKDF로 콘텐츠 암호화 키 및 nonce 도출
    const ikm = await deriveIKM(sharedBits, authSecret, receiverPublicKey, senderPublicKeyRaw);
    const contentKey = await deriveContentKey(ikm, salt);
    const nonce = await deriveNonce(ikm, salt);

    // AES-128-GCM 암호화
    const plaintext = new TextEncoder().encode(JSON.stringify(payload));
    // 패딩: 2바이트 길이 0 + plaintext
    const padded = new Uint8Array(2 + plaintext.length);
    padded.set(plaintext, 2);

    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, contentKey, padded),
    );

    // 암호화된 본문 조립 (RFC 8291)
    // salt(16) + rs(4) + keyid_len(1) + sender_public_key(65) + ciphertext
    const rs = 4096;
    const body = new Uint8Array(16 + 4 + 1 + 65 + ciphertext.length);
    let offset = 0;
    body.set(salt, offset); offset += 16;
    body[offset++] = (rs >> 24) & 0xff;
    body[offset++] = (rs >> 16) & 0xff;
    body[offset++] = (rs >> 8) & 0xff;
    body[offset++] = rs & 0xff;
    body[offset++] = 65; // keyid length
    body.set(senderPublicKeyRaw, offset); offset += 65;
    body.set(ciphertext, offset);

    const authorization = await buildVapidHeader(sub.endpoint, vapidPublic, vapidPrivate, subject);

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': authorization,
        'TTL': '86400',
      },
      body: body,
    });

    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// HKDF 유틸
async function hkdf(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

async function deriveIKM(
  sharedSecret: Uint8Array,
  authSecret: Uint8Array,
  receiverPublicKey: Uint8Array,
  senderPublicKey: Uint8Array,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const context = new Uint8Array([
    ...encoder.encode('WebPush: info\0'),
    ...receiverPublicKey,
    ...senderPublicKey,
  ]);
  return hkdf(sharedSecret, authSecret, context, 32);
}

async function deriveContentKey(ikm: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
  const keyBytes = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
}

async function deriveNonce(ikm: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  return hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);
}

// ──────────────────────────────────────────────
// 메인 핸들러
// ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@beautylens.app';

  if (!vapidPublic || !vapidPrivate) {
    return new Response(
      JSON.stringify({ error: 'VAPID 키가 설정되지 않았습니다.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const apiHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  const results: { user_id: string; sent: number; failed: number; product_name: string }[] = [];
  let totalSent = 0;

  try {
    // 1. push_subscriptions가 있는 모든 유저 조회
    const subsRes = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?select=user_id,endpoint,p256dh,auth`,
      { headers: apiHeaders },
    );
    const allSubs: Array<{ user_id: string; endpoint: string; p256dh: string; auth: string }> =
      await subsRes.json();

    if (!Array.isArray(allSubs) || allSubs.length === 0) {
      return new Response(
        JSON.stringify({ message: '구독자 없음', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // user_id 중복 제거
    const userIds = [...new Set(allSubs.map((s) => s.user_id))];

    for (const userId of userIds) {
      const userSubs = allSubs.filter((s) => s.user_id === userId);
      let userSent = 0;
      let userFailed = 0;

      // 2. 해당 유저의 discount_alerts (찜 상품 + 제품 정보 포함)
      const alertsRes = await fetch(
        `${supabaseUrl}/rest/v1/discount_alerts?select=id,product_id,alerted_at,products(id,name,oliveyoung_name,original_price,current_price,discount_rate,is_on_sale)&user_id=eq.${userId}&is_active=eq.true`,
        { headers: apiHeaders },
      );
      const alerts: Array<{
        id: string;
        product_id: string;
        alerted_at: string | null;
        products: {
          id: string;
          name: string;
          oliveyoung_name: string;
          original_price: number;
          current_price: number;
          discount_rate: number;
          is_on_sale: boolean;
        } | null;
      }> = await alertsRes.json();

      for (const alert of alerts || []) {
        const product = alert.products;
        if (!product?.oliveyoung_name) continue;

        try {
          // 3. 현재 가격 조회
          const oyRes = await fetch(
            `${OLIVEYOUNG_BASE}/products?keyword=${encodeURIComponent(product.oliveyoung_name)}&size=1`,
          );
          const oyData = await oyRes.json();
          if (!oyData.success || !oyData.data?.products?.length) continue;

          const oyProduct = oyData.data.products[0];
          const newPrice: number = oyProduct.priceToPay ?? 0;
          const origPrice: number = product.original_price || newPrice;
          if (newPrice <= 0 || origPrice <= 0) continue;

          const newDiscountRate = Math.round(((origPrice - newPrice) / origPrice) * 10000) / 100;
          const isNowOnSale = newDiscountRate >= 5;
          const wasOnSale = product.is_on_sale;
          const discountChanged = Math.abs(newDiscountRate - (product.discount_rate || 0)) >= 3;

          // 4. DB 업데이트
          const alertUpdate: Record<string, unknown> = {
            last_price: newPrice,
            last_discount_rate: newDiscountRate,
            last_checked_at: new Date().toISOString(),
          };

          const shouldNotify = isNowOnSale && (!wasOnSale || discountChanged);

          if (shouldNotify) {
            alertUpdate.alerted_at = new Date().toISOString();

            // products 테이블 업데이트
            await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${product.id}`, {
              method: 'PATCH',
              headers: apiHeaders,
              body: JSON.stringify({
                current_price: newPrice,
                discount_rate: newDiscountRate,
                is_on_sale: true,
              }),
            });

            // 5. 푸시 발송
            const pushPayload: PushPayload = {
              title: '할인 알림 🎉',
              body: `${product.name} ${Math.round(newDiscountRate)}% 할인 중! (${newPrice.toLocaleString('ko-KR')}원)`,
              url: `/history`,
              tag: `discount-${product.id}`,
              productId: product.id,
            };

            for (const sub of userSubs) {
              const pushResult = await sendWebPush(sub, pushPayload, vapidPublic, vapidPrivate, vapidSubject);
              if (pushResult.ok) {
                userSent++;
                totalSent++;
              } else {
                userFailed++;
                // 410 Gone: 구독 만료 → DB에서 삭제
                if (pushResult.status === 410) {
                  await fetch(
                    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${userId}&endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
                    { method: 'DELETE', headers: apiHeaders },
                  );
                }
              }
            }
          }

          await fetch(
            `${supabaseUrl}/rest/v1/discount_alerts?id=eq.${alert.id}`,
            { method: 'PATCH', headers: apiHeaders, body: JSON.stringify(alertUpdate) },
          );

          if (shouldNotify) {
            results.push({ user_id: userId, sent: userSent, failed: userFailed, product_name: product.name });
          }
        } catch {
          continue;
        }
      }

      // 6. price_alerts (목표가 도달 알림)
      const priceAlertsRes = await fetch(
        `${supabaseUrl}/rest/v1/price_alerts?select=id,product_name,product_url,target_price,current_price,source,triggered_at&user_id=eq.${userId}&is_active=eq.true`,
        { headers: apiHeaders },
      );
      const priceAlerts: Array<{
        id: string;
        product_name: string;
        product_url: string;
        target_price: number;
        current_price: number;
        source: string;
        triggered_at: string | null;
      }> = await priceAlertsRes.json();

      for (const pa of priceAlerts || []) {
        // 이미 발송된 알림은 skip
        if (pa.triggered_at) continue;
        // 목표가 미도달
        if (!pa.current_price || pa.current_price > pa.target_price) continue;

        const pushPayload: PushPayload = {
          title: '목표가 도달! 💸',
          body: `${pa.product_name || '상품'}이 목표 가격(${pa.target_price.toLocaleString('ko-KR')}원)에 도달했어요!`,
          url: `/history`,
          tag: `price-alert-${pa.id}`,
        };

        for (const sub of userSubs) {
          const pushResult = await sendWebPush(sub, pushPayload, vapidPublic, vapidPrivate, vapidSubject);
          if (pushResult.ok) {
            userSent++;
            totalSent++;
          }
        }

        // triggered_at 기록 (재발송 방지)
        await fetch(`${supabaseUrl}/rest/v1/price_alerts?id=eq.${pa.id}`, {
          method: 'PATCH',
          headers: apiHeaders,
          body: JSON.stringify({ triggered_at: new Date().toISOString() }),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_sent: totalSent,
        users_processed: userIds.length,
        details: results,
        checked_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('send-push-notification error:', e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
