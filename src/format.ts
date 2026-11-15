export const money = (v: number) => `${v.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
export const dateTime = (iso: string) => new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
