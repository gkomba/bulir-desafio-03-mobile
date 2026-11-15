import { CATEGORIES, categoryIcon, categoryLabel, DEFAULT_CATEGORY } from './constants';
import type { ServiceCategory } from './types';

/** Os códigos que a API aceita (ServiceCategory no backend). */
const CODIGOS_DA_API: ServiceCategory[] = ['HOME', 'BEAUTY', 'TECHNOLOGY', 'EDUCATION', 'HEALTH', 'EVENTS', 'AUTOMOTIVE', 'OTHER'];

describe('categorias dos serviços', () => {
  it('são exatamente as da API, sem repetidas', () => {
    expect(CATEGORIES.map((c) => c.key).sort()).toEqual([...CODIGOS_DA_API].sort());
    expect(new Set(CATEGORIES.map((c) => c.key)).size).toBe(CATEGORIES.length);
  });

  it('têm o nome em português e um ícone cada', () => {
    expect(CATEGORIES.map((c) => c.label)).toEqual(['Casa', 'Beleza', 'Tecnologia', 'Educação', 'Saúde', 'Eventos', 'Automóvel', 'Outros']);
    for (const c of CATEGORIES) expect(c.icon).toBeTruthy();
    expect(new Set(CATEGORIES.map((c) => c.icon)).size).toBe(CATEGORIES.length);
  });

  it('"Outros" é a última e a categoria por omissão', () => {
    expect(CATEGORIES.at(-1)?.key).toBe('OTHER');
    expect(DEFAULT_CATEGORY).toBe('OTHER');
  });

  it.each(CATEGORIES)('$key tem nome e ícone próprios', ({ key, label, icon }) => {
    expect(categoryLabel(key)).toBe(label);
    expect(categoryIcon(key)).toBe(icon);
  });

  it('um código desconhecido cai em "Outros", em vez de partir a tela', () => {
    expect(categoryLabel('NOVA' as ServiceCategory)).toBe('Outros');
    expect(categoryIcon('NOVA' as ServiceCategory)).toBe('apps-outline');
  });
});
