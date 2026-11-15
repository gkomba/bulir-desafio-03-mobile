import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ServiceImage } from './media';
import { formatBytes, prepareImage, type PreparedImage } from '../imageUpload';
import { colors, fonts, radius, spacing } from '../theme';
import type { ServiceCategory } from '../types';

/** O que o formulário vai fazer à imagem ao guardar. */
export type ImageChoice =
  | { kind: 'keep' }
  | { kind: 'remove' }
  | { kind: 'new'; image: PreparedImage };

const SIZE = 160;

/**
 * Escolher a imagem do serviço. A foto é reduzida e comprimida aqui, no telemóvel, e só é
 * enviada ao guardar o serviço (assim, desistir não deixa imagens esquecidas no Cloudinary).
 */
export function ImageField({ category, currentUrl, value, onChange }: {
  category: ServiceCategory; currentUrl?: string; value: ImageChoice; onChange: (v: ImageChoice) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1, exif: false });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      onChange({ kind: 'new', image: await prepareImage({ uri: asset.uri, width: asset.width, height: asset.height }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível usar essa imagem.');
    } finally {
      setBusy(false);
    }
  };

  const shown = value.kind === 'keep' ? currentUrl : undefined;
  const hasImage = value.kind === 'new' || (value.kind === 'keep' && !!currentUrl);
  const box = { width: SIZE, height: SIZE, borderRadius: radius.md };

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.bodyBold, color: colors.text, marginBottom: 8, marginLeft: 4 }}>Imagem</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable onPress={pick} disabled={busy} accessibilityRole="button" accessibilityLabel={hasImage ? 'Mudar imagem' : 'Escolher imagem'}>
          {value.kind === 'new' ? (
            <Image source={{ uri: value.image.uri }} style={box} contentFit="cover" accessibilityLabel="Pré-visualização" />
          ) : (
            <ServiceImage category={category} imageUrl={shown} width={SIZE} height={SIZE} style={box} iconSize={44} />
          )}
          {busy && (
            <View style={[box, { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1, gap: 8 }}>
          <Pressable onPress={pick} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button">
            <Ionicons name="image-outline" size={18} color={colors.accent} />
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.accent }}>{hasImage ? 'Mudar imagem' : 'Escolher imagem'}</Text>
          </Pressable>
          {hasImage && (
            <Pressable onPress={() => onChange({ kind: 'remove' })} disabled={busy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityRole="button">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.danger }}>Tirar imagem</Text>
            </Pressable>
          )}
          {value.kind === 'new' && <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>Pronta a enviar ({formatBytes(value.image.bytes)})</Text>}
          {value.kind === 'remove' && currentUrl && (
            <Pressable onPress={() => onChange({ kind: 'keep' })} accessibilityRole="button"><Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.muted }}>A imagem será tirada. Desfazer</Text></Pressable>
          )}
        </View>
      </View>
      {!!error && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6, marginLeft: 4 }}>{error}</Text>}
    </View>
  );
}
