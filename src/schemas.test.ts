import { amountSchema, cardSchema, loginSchema, registerSchema, serviceSchema } from './schemas';

const erros = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? [] : (r.error?.issues ?? []).map((i) => `${String(i.path[0])}: ${i.message}`);

describe('loginSchema: e-mail ou NIF e senha', () => {
  it.each(['ana@exemplo.com', '123456789', 'AB1234567890', '123456789LA1'])('aceita o identificador %s', (identifier) => {
    expect(loginSchema.safeParse({ identifier, password: 'x' }).success).toBe(true);
  });

  it.each(['', 'ana', 'ana@', '12345', 'tem espaço 123456', '123-456-789'])('recusa o identificador "%s"', (identifier) => {
    expect(loginSchema.safeParse({ identifier, password: 'x' }).success).toBe(false);
  });

  it('exige a senha e limita-a a 72 caracteres', () => {
    expect(erros(loginSchema.safeParse({ identifier: 'ana@exemplo.com', password: '' }))).toEqual(['password: Introduza a palavra-passe']);
    expect(loginSchema.safeParse({ identifier: 'ana@exemplo.com', password: 'a'.repeat(73) }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: 'ana@exemplo.com', password: 'a'.repeat(72) }).success).toBe(true);
  });

  it('tira os espaços à volta do identificador', () => {
    expect(loginSchema.parse({ identifier: '  ana@exemplo.com ', password: 'x' }).identifier).toBe('ana@exemplo.com');
  });
});

describe('registerSchema: o NIF é só dos prestadores', () => {
  const base = { name: 'Ana Silva', email: 'ana@exemplo.com', password: 'senha-forte-1' };

  it('aceita um cliente sem NIF', () => {
    expect(registerSchema.safeParse({ ...base, role: 'CLIENT' }).success).toBe(true);
  });

  it('exige o NIF a um prestador', () => {
    expect(erros(registerSchema.safeParse({ ...base, role: 'PROVIDER' }))).toEqual(['nif: NIF com 9 a 14 letras ou números']);
    expect(erros(registerSchema.safeParse({ ...base, role: 'PROVIDER', nif: '' }))).toEqual(['nif: NIF com 9 a 14 letras ou números']);
  });

  it.each(['12345678', '1'.repeat(15), '12345-6789'])('recusa o NIF "%s" de um prestador', (nif) => {
    expect(registerSchema.safeParse({ ...base, role: 'PROVIDER', nif }).success).toBe(false);
  });

  it('aceita o NIF de 9 a 14 letras ou números', () => {
    expect(registerSchema.safeParse({ ...base, role: 'PROVIDER', nif: '092402003LA1' }).success).toBe(true);
  });

  it.each([
    ['nome curto', { name: 'Al' }],
    ['nome com mais de 120 caracteres', { name: 'a'.repeat(121) }],
    ['e-mail inválido', { email: 'ana@' }],
    ['senha com 7 caracteres', { password: '1234567' }],
    ['senha com mais de 72 caracteres', { password: 'a'.repeat(73) }],
    ['perfil inexistente', { role: 'ADMIN' }],
  ])('recusa %s', (_nome, extra) => {
    expect(registerSchema.safeParse({ ...base, role: 'CLIENT', ...extra }).success).toBe(false);
  });

  it('aceita a senha de 8 caracteres', () => {
    expect(registerSchema.safeParse({ ...base, role: 'CLIENT', password: '12345678' }).success).toBe(true);
  });
});

describe('serviceSchema: preço maior que zero', () => {
  const base = { title: 'Canalização', description: 'Reparação de fugas' };

  it.each(['0,01', '1', '150,50', '10000000'])('aceita o preço %s', (price) => {
    expect(serviceSchema.safeParse({ ...base, price }).success).toBe(true);
  });

  it.each(['0', '0,00', '0,004', '-1', '-10', 'abc', '', '10000001'])('recusa o preço "%s"', (price) => {
    expect(serviceSchema.safeParse({ ...base, price }).success).toBe(false);
  });

  it('valida o título e a descrição', () => {
    expect(serviceSchema.safeParse({ ...base, title: 'ab', price: '1' }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, title: 'a'.repeat(121), price: '1' }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, description: '  ', price: '1' }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...base, description: 'a'.repeat(1001), price: '1' }).success).toBe(false);
  });
});

describe('amountSchema: carregamento de saldo', () => {
  it.each(['0,01', '5000', '1000000'])('aceita %s', (amount) => expect(amountSchema.safeParse({ amount }).success).toBe(true));
  it.each(['0', '-5', 'abc', '', '1000001'])('recusa "%s"', (amount) => expect(amountSchema.safeParse({ amount }).success).toBe(false));
});

describe('cardSchema: só passa um cartão bem formado', () => {
  const ok = { number: '4111 1111 1111 1111', holder: 'Ana Silva', expiry: '12/30', cvv: '123' };
  it('aceita e tira os espaços do número', () => {
    expect(cardSchema.parse(ok).number).toBe('4111111111111111');
  });
  it.each([{ number: '4111' }, { expiry: '13/30' }, { expiry: '1230' }, { cvv: '12' }, { holder: 'A' }])('recusa %j', (extra) => {
    expect(cardSchema.safeParse({ ...ok, ...extra }).success).toBe(false);
  });
});
