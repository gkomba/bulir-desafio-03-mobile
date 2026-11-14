import { Platform } from 'react-native';

// O emulador Android acede ao computador em 10.0.2.2. Num telemóvel real, defina EXPO_PUBLIC_API_URL
// com o IP do computador (ex.: http://192.168.1.10:3000).
const host = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_URL = `${process.env.EXPO_PUBLIC_API_URL ?? host}/v1`;
