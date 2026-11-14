// Paleta da logo Bulir + layout do template Shoppe
export const colors = {
  primary: '#32ECC7',   // verde-água da logo
  accent: '#0A9B80',    // verde escuro p/ texto e ícones sobre fundo claro (contraste)
  navy: '#0C1E3A',      // azul-marinho da logo
  tint: '#DDFBF4',      // chips / pills azul-claro
  tintSoft: '#F0FDFA',
  bg: '#FFFFFF',
  field: '#F5F5F7',     // fundo dos inputs
  card: '#FFFFFF',
  text: '#0C1E3A',
  dark: '#0C1E3A',      // botões secundários (ex.: "Okay", "Pay")
  muted: '#7A7F8C',
  border: '#E6E9F0',
  danger: '#FF5C8A',    // rosa do template (Send Again / desconto)
  dangerSoft: '#FFE8EE',
  success: '#22A559',
};
export const fonts = {
  heading: 'Raleway_800ExtraBold',
  headingSemi: 'Raleway_700Bold',
  body: 'Nunito_400Regular',
  bodyBold: 'Nunito_700Bold',
};
export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const shadow = {
  shadowColor: '#0C1E3A', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3,
};

/** Sombra bem suave, como os cartões do template */
export const shadowSoft = {
  shadowColor: '#0C1E3A', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
};
