import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import {
  CloudSun, Droplets, Wind, Sun, AlertTriangle,
  ChevronRight, Loader2, RefreshCw, Plus,
} from 'lucide-react';

interface WeatherData {
  temp: number;
  humidity: number;
  dust: 'good' | 'moderate' | 'bad' | 'very_bad';
  uv: number;
  weather: string;
  city: string;
}

interface RoutineStep {
  step: number;
  productName: string;
  isFromCabinet: boolean;
  reason: string;
}

interface ExtraRec {
  productType: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

interface WeatherRoutineResult {
  weatherAlert: string;
  weatherTips: string[];
  recommendedRoutine: RoutineStep[];
  extraRecommendations: ExtraRec[];
  overallAdvice: string;
}

interface CabinetItem {
  id: string;
  product_name: string;
  product_brand: string | null;
  category: string;
  step_order: number;
  is_morning: boolean;
  is_evening: boolean;
}

const DUST_CONFIG = {
  good:     { label: '좋음',    color: 'text-blue-500',   bg: 'bg-blue-50' },
  moderate: { label: '보통',    color: 'text-green-500',  bg: 'bg-green-50' },
  bad:      { label: '나쁨',    color: 'text-orange-500', bg: 'bg-orange-50' },
  very_bad: { label: '매우 나쁨', color: 'text-red-500',   bg: 'bg-red-50' },
};

const UV_LEVEL = (uv: number) => {
  if (uv <= 2) return { label: '낮음', color: 'text-green-500' };
  if (uv <= 5) return { label: '보통', color: 'text-yellow-500' };
  if (uv <= 7) return { label: '높음', color: 'text-orange-500' };
  return { label: '매우 높음', color: 'text-red-500' };
};

// 브라우저 Geolocation + Open-Meteo 무료 API로 날씨 가져오기
async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });
    const { latitude: lat, longitude: lon } = pos.coords;

    // Open-Meteo 무료 날씨 API (API key 불필요)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,uv_index,weathercode&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const current = data.current;

    // WMO 날씨 코드 → 한국어
    const wmoLabel = (code: number): string => {
      if (code === 0) return '맑음';
      if (code <= 3) return '구름';
      if (code <= 48) return '안개';
      if (code <= 57) return '이슬비';
      if (code <= 67) return '비';
      if (code <= 77) return '눈';
      if (code <= 82) return '소나기';
      return '뇌우';
    };

    // 미세먼지: 간단히 습도+날씨코드로 추정 (실제 PM2.5 API 없이)
    const humidity: number = current.relative_humidity_2m ?? 60;
    const weatherCode: number = current.weathercode ?? 0;
    let dust: WeatherData['dust'] = 'good';
    if (humidity > 80 || weatherCode >= 51) dust = 'moderate';
    // 실제 서비스에서는 IQAir나 OpenAQ API 연결 권장

    // 역지오코딩으로 도시명
    let city = '현재 위치';
    try {
      const geocodeRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`
      );
      const geocodeData = await geocodeRes.json();
      city = geocodeData.address?.city
        || geocodeData.address?.county
        || geocodeData.address?.state
        || '현재 위치';
    } catch { /* ignore */ }

    return {
      temp: Math.round(current.temperature_2m ?? 20),
      humidity: Math.round(humidity),
      dust,
      uv: Math.round(current.uv_index ?? 3),
      weather: wmoLabel(weatherCode),
      city,
    };
  } catch {
    // 위치 권한 거부 등의 경우 기본값 반환
    return null;
  }
}

interface Props {
  period: 'morning' | 'evening';
}

const WeatherRoutineCard = ({ period }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUser();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [result, setResult] = useState<WeatherRoutineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [cabinetCount, setCabinetCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  // 캐시 키 (날짜+시간대)
  const cacheKey = `weather_routine_${period}_${new Date().toDateString()}`;

  const loadWeatherAndRoutine = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    // 캐시 확인
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setWeather(parsed.weather);
        setResult(parsed.result);
        setCabinetCount(parsed.cabinetCount);
        setLastFetched(parsed.fetchedAt);
        setWeatherLoading(false);
        return;
      }
    }

    setWeatherLoading(true);

    // 1) 날씨 가져오기
    const weatherData = await fetchWeather();
    setWeather(weatherData);

    // 2) 보관함 제품 가져오기
    const { data: cabinet } = await supabase
      .from('my_cabinet' as never)
      .select('id, product_name, product_brand, category, step_order, is_morning, is_evening')
      .eq('user_id', user.id);

    const items = (cabinet as CabinetItem[]) ?? [];
    setCabinetCount(items.length);
    setWeatherLoading(false);

    if (!weatherData || items.length === 0) return;

    // 3) AI 추천 요청
    setLoading(true);
    try {
      const skinProfilePayload = profile.skinType ? {
        skinType: profile.skinType,
        skinConcerns: profile.skinConcerns,
        skinSensitivity: profile.skinSensitivity,
      } : undefined;

      const { data, error } = await supabase.functions.invoke('weather-routine', {
        body: { weather: weatherData, cabinetItems: items, skinProfile: skinProfilePayload, period },
      });

      if (!error && data) {
        setResult(data as WeatherRoutineResult);
        const now = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        setLastFetched(now);
        sessionStorage.setItem(cacheKey, JSON.stringify({
          weather: weatherData,
          result: data,
          cabinetCount: items.length,
          fetchedAt: now,
        }));
      }
    } catch (e) {
      console.error('weather-routine 오류:', e);
    } finally {
      setLoading(false);
    }
  }, [user, profile, period, cacheKey]);

  useEffect(() => { loadWeatherAndRoutine(); }, [loadWeatherAndRoutine]);

  if (weatherLoading) {
    return (
      <div className="mx-4 rounded-2xl border border-border bg-white shadow-card p-4 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">날씨 확인 중...</p>
          <p className="text-[10px] text-muted-foreground">오늘 날씨에 맞는 루틴을 준비해요</p>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="mx-4 rounded-2xl border border-dashed border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <CloudSun className="h-8 w-8 shrink-0 text-muted-foreground/50 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground">날씨 정보를 가져올 수 없어요</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              위치 권한을 허용하면 오늘 날씨에 맞는 루틴 추천을 받을 수 있어요.<br />
              브라우저 주소창 왼쪽의 자물쇠 아이콘 → 위치 권한을 <span className="font-semibold text-foreground">허용</span>으로 변경해주세요.
            </p>
          </div>
        </div>
        <button
          onClick={() => loadWeatherAndRoutine(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2 text-xs font-semibold text-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 다시 시도
        </button>
      </div>
    );
  }

  if (cabinetCount === 0) {
    return (
      <button
        onClick={() => navigate('/cabinet')}
        className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Plus className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">화장품 보관함을 채워보세요</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">오늘 {weather.temp}°C · {weather.weather} — 날씨 맞춤 루틴을 받으려면 제품 등록이 필요해요</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  const dustCfg = DUST_CONFIG[weather.dust];
  const uvCfg = UV_LEVEL(weather.uv);
  const periodLabel = period === 'morning' ? '아침' : '저녁';
  const periodEmoji = period === 'morning' ? '🌅' : '🌙';

  return (
    <div className="mx-4 rounded-2xl border border-border bg-white shadow-card overflow-hidden">
      {/* 날씨 헤더 */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white text-lg">
            {weather.weather.includes('비') ? '🌧️' : weather.weather.includes('눈') ? '❄️' : weather.weather.includes('구름') ? '⛅' : '☀️'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">{periodEmoji} {periodLabel} 루틴 추천</span>
              {result?.weatherAlert && (
                <span className="text-[10px] text-primary font-medium truncate max-w-[140px]">{result.weatherAlert}</span>
              )}
            </div>
            {/* 날씨 데이터 칩 */}
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                🌡️ {weather.temp}°C
              </span>
              <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                <Droplets className="h-2.5 w-2.5 text-blue-400" /> {weather.humidity}%
              </span>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${dustCfg.bg} ${dustCfg.color}`}>
                <Wind className="h-2.5 w-2.5" /> 미세먼지 {dustCfg.label}
              </span>
              <span className={`flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold ${uvCfg.color}`}>
                <Sun className="h-2.5 w-2.5" /> UV {weather.uv}
              </span>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* 펼쳐진 내용 */}
      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-neutral-50">
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">AI가 루틴을 구성 중이에요...</span>
            </div>
          ) : result ? (
            <>
              {/* 날씨 팁 */}
              {result.weatherTips?.length > 0 && (
                <div className="space-y-1.5">
                  {result.weatherTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500 mt-0.5" />
                      <p className="text-xs text-foreground leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 추천 루틴 */}
              {result.recommendedRoutine?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-foreground mb-2">오늘 추천 루틴</p>
                  <div className="space-y-2">
                    {result.recommendedRoutine.map(step => (
                      <div key={step.step} className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground mt-0.5">
                          {step.step}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-foreground">{step.productName}</p>
                            {step.isFromCabinet && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">보관함</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{step.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 추가 추천 */}
              {result.extraRecommendations?.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-primary">오늘 이것도 추가하면 좋아요</p>
                  {result.extraRecommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        rec.urgency === 'high' ? 'bg-red-100 text-red-600' :
                        rec.urgency === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {rec.urgency === 'high' ? '필수' : rec.urgency === 'medium' ? '권장' : '선택'}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{rec.productType}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.reason}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/cabinet')}
                    className="text-[10px] text-primary font-medium underline underline-offset-2"
                  >
                    보관함에 제품 추가하기 →
                  </button>
                </div>
              )}

              {/* 전체 조언 */}
              {result.overallAdvice && (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                  {result.overallAdvice}
                </p>
              )}

              {/* 새로고침 + 마지막 업데이트 */}
              <div className="flex items-center justify-between">
                {lastFetched && (
                  <p className="text-[10px] text-muted-foreground">마지막 업데이트 {lastFetched}</p>
                )}
                <button
                  onClick={() => loadWeatherAndRoutine(true)}
                  className="flex items-center gap-1 text-[10px] text-primary font-medium"
                >
                  <RefreshCw className="h-3 w-3" /> 새로고침
                </button>
              </div>
            </>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">추천을 불러오지 못했어요</p>
              <button onClick={() => loadWeatherAndRoutine(true)} className="mt-2 text-xs text-primary font-medium underline">
                다시 시도
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherRoutineCard;
