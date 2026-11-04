import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '@/constants/api';
import type { AppColors } from '@/constants/app-theme';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import { authenticatedApi } from '@/services/authenticated-api';
import { pickImage, uploadImage } from '@/services/image-upload';

type EvidencePhoto = { id: string; createdAt: string; author: { id: string; name: string }; mine: boolean };
type EvidenceList = { status: string; max: number; canUpload: boolean; photos: EvidencePhoto[] };

const MAX_BYTES = 2097152;

// Fotos privadas del trabajo: las ven y suben solo el cliente y el trabajador asignado.
export default function EvidenceScreen() {
  const { colors, t, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [data, setData] = useState<EvidenceList | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<EvidencePhoto | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setToken(await SecureStore.getItemAsync('accessToken'));
      setData(await authenticatedApi<EvidenceList>(`/jobs/${id}/evidencias`));
    } catch (failure) {
      setError(failure instanceof Error ? t(failure.message) : t('No se pudieron cargar las evidencias.'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const add = async (camera: boolean) => {
    if (busy) return;
    try {
      const image = await pickImage(camera, MAX_BYTES, t);
      if (!image) return;
      setBusy(true);
      await uploadImage(`/jobs/${id}/evidencias`, 'POST', image);
      await load();
    } catch (failure) {
      Alert.alert(t('Error'), failure instanceof Error ? t(failure.message) : t('No se pudo subir la foto.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = (photo: EvidencePhoto) => Alert.alert(t('Quitar foto'), t('¿Quieres quitar esta foto de evidencia?'), [
    { text: t('Volver'), style: 'cancel' },
    { text: t('Quitar'), style: 'destructive', onPress: async () => {
      try {
        setBusy(true);
        await authenticatedApi(`/jobs/${id}/evidencias/${photo.id}`, 'DELETE');
        setSelected(null);
        await load();
      } catch (failure) {
        Alert.alert(t('Error'), failure instanceof Error ? t(failure.message) : t('No se pudo quitar la foto.'));
      } finally {
        setBusy(false);
      }
    } },
  ]);

  const source = (photo: EvidencePhoto) => ({ uri: `${API_URL}/jobs/${id}/evidencias/${photo.id}`, headers: { Authorization: `Bearer ${token}` } });

  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Volver')}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t('Fotos de evidencia')}</Text>
        {title ? <Text style={styles.subtitle} numberOfLines={1}>{title}</Text> : null}
      </View>
    </View>

    {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} /> : error ? (
      <View style={styles.empty}><Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.secondary} onPress={() => { setLoading(true); load(); }}><Text style={styles.secondaryText}>{t('Reintentar')}</Text></TouchableOpacity></View>
    ) : data && <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.help}>{t('Solo tú, la otra persona del trabajo y la administración pueden ver estas fotos. {count} de {max}.', { count: String(data.photos.length), max: String(data.max) })}</Text>

      {data.photos.length === 0 ? <View style={styles.empty}>
        <Ionicons name="images-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyText}>{t('Aún no hay fotos de evidencia.')}</Text>
      </View> : <View style={styles.grid}>
        {data.photos.map(photo => <Pressable key={photo.id} style={styles.tile} onPress={() => setSelected(photo)} accessibilityRole="imagebutton" accessibilityLabel={t('Foto de {name}', { name: photo.author.name })}>
          <Image source={source(photo)} cachePolicy="none" contentFit="cover" style={styles.thumb} />
          <Text style={styles.caption} numberOfLines={1}>{photo.mine ? t('Tú') : photo.author.name} · {new Date(photo.createdAt).toLocaleDateString(locale)}</Text>
        </Pressable>)}
      </View>}

      {data.canUpload ? <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => add(true)}>
          {busy ? <ActivityIndicator color={colors.onPrimary} /> : <><Ionicons name="camera-outline" size={18} color={colors.onPrimary} /><Text style={styles.primaryText}>{t('Tomar foto')}</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => add(false)}>
          <Ionicons name="image-outline" size={18} color={colors.text} /><Text style={styles.secondaryText}>{t('Elegir de la galería')}</Text>
        </TouchableOpacity>
      </View> : <Text style={styles.help}>{t(data.photos.length >= data.max ? 'Se alcanzó el máximo de fotos.' : 'Puedes subir fotos cuando el trabajo esté en proceso o completado.')}</Text>}
    </ScrollView>}

    <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
      <View style={styles.viewer}>
        {selected && <Image source={source(selected)} cachePolicy="none" contentFit="contain" style={styles.full} />}
        <View style={styles.viewerActions}>
          {selected?.mine && data?.status === 'EN_PROCESO' && <TouchableOpacity style={styles.viewerButton} disabled={busy} onPress={() => remove(selected)}>
            <Ionicons name="trash-outline" size={18} color={colors.dangerText} /><Text style={[styles.secondaryText, { color: colors.dangerText }]}>{t('Quitar')}</Text>
          </TouchableOpacity>}
          <TouchableOpacity style={styles.viewerButton} onPress={() => setSelected(null)}>
            <Ionicons name="close" size={18} color={colors.text} /><Text style={styles.secondaryText}>{t('Cerrar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  back: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 2 },
  content: { padding: 20, gap: 16 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { width: '47%', borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  thumb: { width: '100%', aspectRatio: 1, backgroundColor: colors.elevated },
  caption: { color: colors.secondary, fontSize: 12, padding: 8 },
  actions: { gap: 10 },
  primary: { minHeight: 48, borderRadius: 13, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: colors.onPrimary, fontSize: 14, fontWeight: '900' },
  secondary: { minHeight: 46, paddingHorizontal: 16, borderRadius: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryText: { color: colors.text, fontSize: 14, fontWeight: '800' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', padding: 16 },
  full: { flex: 1 },
  viewerActions: { flexDirection: 'row', gap: 10, justifyContent: 'center', paddingVertical: 16 },
  viewerButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 13, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
