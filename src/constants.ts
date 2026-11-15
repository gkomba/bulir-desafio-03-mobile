import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { ServiceCategory } from './types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** As categorias, pela ordem em que se mostram. A API guarda só o código. */
export const CATEGORIES: { key: ServiceCategory; label: string; icon: IconName }[] = [
  { key: 'HOME', label: 'Casa', icon: 'home-outline' },
  { key: 'BEAUTY', label: 'Beleza', icon: 'sparkles-outline' },
  { key: 'TECHNOLOGY', label: 'Tecnologia', icon: 'laptop-outline' },
  { key: 'EDUCATION', label: 'Educação', icon: 'school-outline' },
  { key: 'HEALTH', label: 'Saúde', icon: 'fitness-outline' },
  { key: 'EVENTS', label: 'Eventos', icon: 'balloon-outline' },
  { key: 'AUTOMOTIVE', label: 'Automóvel', icon: 'car-outline' },
  { key: 'OTHER', label: 'Outros', icon: 'apps-outline' },
];

export const DEFAULT_CATEGORY: ServiceCategory = 'OTHER';

const byKey = (key: ServiceCategory) => CATEGORIES.find((c) => c.key === key);
export const categoryLabel = (key: ServiceCategory): string => byKey(key)?.label ?? 'Outros';
export const categoryIcon = (key: ServiceCategory): IconName => byKey(key)?.icon ?? 'apps-outline';
