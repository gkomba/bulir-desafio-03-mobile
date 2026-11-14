import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export const Blobs = ({ variant = 'top' }: { variant?: 'top' | 'topRight' }) => (
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, overflow: 'hidden' }}>
    <View style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: colors.tint, top: -150, [variant === 'top' ? 'left' : 'right']: -60 }} />
    <View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.primary, top: -170, [variant === 'top' ? 'left' : 'right']: -110 }} />
    <View style={{ position: 'absolute', width: 110, height: 150, borderRadius: 60, backgroundColor: colors.primary, top: 150, [variant === 'top' ? 'right' : 'left']: -50 }} />
  </View>
);

export function Screen({ children, scroll = true, style, blobs }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle; blobs?: 'top' | 'topRight' }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
      {blobs && <Blobs variant={blobs} />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll
          ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[{ padding: spacing.md }, style]}>{children}</ScrollView>
          : <View style={[{ flex: 1, padding: spacing.md }, style]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
