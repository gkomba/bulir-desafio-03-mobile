import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Introduza e-mail ou NIF')
    .refine((v) => /^\S+@\S+\.\S+$/.test(v) || /^[A-Za-z0-9]{9,14}$/.test(v), 'E-mail ou NIF (9 a 14 caracteres) inválido'),
  password: z.string().min(1, 'Introduza a palavra-passe'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  nif: z.string().trim().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
  role: z.enum(['CLIENT', 'PROVIDER']),
}).superRefine((d, ctx) => {
  // O NIF é só dos prestadores, e obrigatório neles.
  if (d.role === 'PROVIDER' && !/^[A-Za-z0-9]{9,14}$/.test(d.nif ?? '')) {
    ctx.addIssue({ code: 'custom', path: ['nif'], message: 'NIF com 9 a 14 letras ou números' });
  }
});
export type RegisterForm = z.infer<typeof registerSchema>;

export const serviceSchema = z.object({
  title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres'),
  description: z.string().trim().min(1, 'Introduza uma descrição').max(1000, 'Máximo 1000 caracteres'),
  price: z.string().refine((v) => {
    const n = Number(v.replace(',', '.'));
    return n > 0 && n <= 10_000_000;
  }, 'Preço entre 0,01 e 10 000 000 Kz'),
});
export type ServiceForm = z.infer<typeof serviceSchema>;

export const cardSchema = z.object({
  number: z.string().transform((v) => v.replace(/\s/g, '')).pipe(z.string().regex(/^\d{16}$/, 'Número do cartão deve ter 16 dígitos')),
  holder: z.string().trim().min(3, 'Nome do titular obrigatório'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Formato MM/AA'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
});
export type CardForm = z.input<typeof cardSchema>;

export const amountSchema = z.object({
  amount: z.string().refine((v) => {
    const n = Number(v.replace(',', '.'));
    return n > 0 && n <= 1_000_000;
  }, 'Valor entre 0,01 e 1 000 000 Kz'),
});
export type AmountForm = z.infer<typeof amountSchema>;
