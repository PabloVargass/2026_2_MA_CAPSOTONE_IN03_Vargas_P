import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { API_URL } from '@/constants/api';
import { useAppPreferences } from '@/context/app-preferences';

// Foto de perfil pública; si no hay foto o no carga, muestra la inicial como antes.
export function UserAvatar({ userId, name, photoUpdatedAt, size = 90, style }: {
  userId?: string | null; name?: string | null; photoUpdatedAt?: string | null; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppPreferences();
  const [failed, setFailed] = useState<string | null>(null);
  const version = photoUpdatedAt ? new Date(photoUpdatedAt).getTime() : null;
  const showPhoto = Boolean(userId && version && failed !== `${userId}:${version}`);
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary }, styles.base, style]}>
    {showPhoto ? <Image source={{ uri: `${API_URL}/users/${userId}/foto?v=${version}` }} style={{ width: '100%', height: '100%' }} contentFit="cover"
      accessibilityLabel={name ?? undefined} onError={() => setFailed(`${userId}:${version}`)} />
      : <Text style={{ color: colors.onPrimary, fontSize: size * 0.42, fontWeight: '800' }}>{name?.trim().charAt(0).toUpperCase() || '?'}</Text>}
  </View>;
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } });
