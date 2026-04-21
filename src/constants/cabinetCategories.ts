/**
 * 보관함 카테고리 / 사용 단계 / 카테고리별 디폴트 매핑
 * - MyCabinet.tsx와 AddToCabinetSheet, ImportFromAnalysesSheet에서 공유
 */

export type CategoryKey =
  | 'cleansing_water' | 'cleansing_oil' | 'cleansing_foam'
  | 'skincare' | 'suncare' | 'treatment' | 'makeup' | 'body' | 'hair';

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  emoji: string;
  group: 'cleansing' | 'skincare' | 'other';
  /** 빠른 등록 시 디폴트 step_order */
  defaultStep: number;
  /** 빠른 등록 시 디폴트 아침/저녁 */
  defaultMorning: boolean;
  defaultEvening: boolean;
}

export const CABINET_CATEGORIES: CategoryDef[] = [
  { key: 'cleansing_water', label: '클렌징워터', emoji: '💧', group: 'cleansing', defaultStep: 1, defaultMorning: true,  defaultEvening: true  },
  { key: 'cleansing_oil',   label: '클렌징오일', emoji: '🫙', group: 'cleansing', defaultStep: 1, defaultMorning: false, defaultEvening: true  },
  { key: 'cleansing_foam',  label: '클렌징폼',   emoji: '🫧', group: 'cleansing', defaultStep: 1, defaultMorning: true,  defaultEvening: true  },
  { key: 'skincare',        label: '스킨케어',   emoji: '🧴', group: 'skincare',  defaultStep: 2, defaultMorning: true,  defaultEvening: true  },
  { key: 'suncare',         label: '선케어',     emoji: '☀️', group: 'skincare',  defaultStep: 8, defaultMorning: true,  defaultEvening: false },
  { key: 'treatment',       label: '트리트먼트', emoji: '💊', group: 'skincare',  defaultStep: 4, defaultMorning: false, defaultEvening: true  },
  { key: 'makeup',          label: '메이크업',   emoji: '💄', group: 'other',     defaultStep: 9, defaultMorning: true,  defaultEvening: false },
  { key: 'body',            label: '바디케어',   emoji: '🛁', group: 'other',     defaultStep: 5, defaultMorning: false, defaultEvening: true  },
  { key: 'hair',            label: '헤어케어',   emoji: '💆', group: 'other',     defaultStep: 5, defaultMorning: false, defaultEvening: true  },
];

export const getCategoryDef = (key: string): CategoryDef =>
  CABINET_CATEGORIES.find(c => c.key === key)
    ?? { key: 'skincare', label: key, emoji: '🧴', group: 'skincare',
         defaultStep: 2, defaultMorning: true, defaultEvening: true };
