import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '@/constants/app-theme';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';

// Guía del cuestionario. Usa un ícono neutro hasta que exista un logo propio de ServiciosYa:
// reemplazar el contenido de `avatar` basta para cambiarlo en todas las pantallas.
export function OnboardingGuide({ message, layout = 'row', mood = 'default' }: { message: string; layout?: 'row' | 'center'; mood?: 'default' | 'happy' }) {
  const { colors } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const center = layout === 'center';
  return <View style={center ? styles.center : styles.row}>
    {center && <View style={styles.bubble}><Text style={styles.message}>{message}</Text><View style={[styles.tail, styles.tailDown]} /></View>}
    <View style={[styles.avatar, center && styles.avatarLarge]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ionicons name={mood === 'happy' ? 'sparkles' : 'construct'} size={center ? 56 : 34} color={colors.accent} />
    </View>
    {!center && <View style={[styles.bubble, { flex: 1 }]}><View style={[styles.tail, styles.tailLeft]} /><Text style={styles.message} accessibilityRole="header">{message}</Text></View>}
  </View>;
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  center: { alignItems: 'center', gap: 22 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarLarge: { width: 120, height: 120, borderRadius: 60 },
  bubble: { borderWidth: 2, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: colors.background },
  message: { color: colors.text, fontSize: 18, lineHeight: 25, fontWeight: '600' },
  tail: { position: 'absolute', width: 16, height: 16, backgroundColor: colors.background, borderColor: colors.border, transform: [{ rotate: '45deg' }] },
  tailLeft: { left: -9, top: '50%', marginTop: -8, borderLeftWidth: 2, borderBottomWidth: 2 },
  tailDown: { bottom: -9, left: '50%', marginLeft: -8, borderRightWidth: 2, borderBottomWidth: 2 },
});
