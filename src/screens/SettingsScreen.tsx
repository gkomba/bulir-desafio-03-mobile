import React from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { signOut } from '../api';
import { useAuth } from '../store/auth';
import { dialog } from '../store/dialog';
import { MenuItem } from '../components/home';
import { Card, Title } from '../components/ui';
import { Screen } from '../components/Screen';
import { colors, fonts, spacing } from '../theme';

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <>
    <Text style={{ fontFamily: fonts.bodyBold, color: colors.muted, marginTop: spacing.md, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', fontSize: 11 }}>{title}</Text>
    <Card style={{ paddingVertical: 4 }}>{children}</Card>
  </>
);

export default function SettingsScreen({ navigation }: NativeStackScreenProps<any>) {
  const user = useAuth((s) => s.user);
  return (
    <Screen>
      <Title style={{ fontSize: 30 }}>Definições</Title>
      <Group title="Conta">
        <MenuItem icon="person-outline" label="Perfil" hint={user?.name} />
        <MenuItem icon="wallet-outline" label="Carteira" onPress={() => navigation.navigate('Wallet')} />
        <MenuItem icon="card-outline" label="Métodos de pagamento" onPress={() => navigation.navigate('PaymentMethods')} />
      </Group>
      <Group title="Suporte">
        <MenuItem icon="help-circle-outline" label="Ajuda e suporte" onPress={() => dialog.alert('Contacte-nos em suporte@bulir.com', 'Ajuda')} />
        <MenuItem icon="document-text-outline" label="Termos e privacidade" onPress={() => dialog.alert('Os seus dados são usados apenas para operar a plataforma.', 'Privacidade')} />
        <MenuItem icon="information-circle-outline" label="Sobre" hint={`Presta-ja · versão ${Constants.expoConfig?.version ?? '1.0.0'}`} />
      </Group>
      <Group title="Sessão">
        <MenuItem icon="log-out-outline" label="Terminar sessão" danger onPress={() => dialog.confirm('Tem a certeza que quer sair?', signOut, { title: 'Terminar sessão', confirmText: 'Sair', destructive: true })} />
      </Group>
    </Screen>
  );
}
