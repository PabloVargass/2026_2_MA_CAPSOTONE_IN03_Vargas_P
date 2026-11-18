import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';

// Solicitud a administración sin documentos: el mensaje es opcional.
export function IdentityRequestModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { t, colors } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    if (busy) return;
    setBusy(true);
    try {
      const mensaje = message.trim();
      await authenticatedApi('/identity/me/solicitud', 'POST', mensaje ? { mensaje } : {});
      Alert.alert(t('Solicitud enviada'), t('Administración revisará tu solicitud. Podrás publicar cuando sea aprobada.'));
      onSent();
    } catch (error) { Alert.alert(t('No se pudo enviar'), error instanceof Error ? error.message : t('Error de conexión')); }
    finally { setBusy(false); }
  }
  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t('Enviar solicitud a administración')}</Text>
          <Text style={styles.text}>{t('Administración revisará tu cuenta y te habilitará para publicar. Si luego quieres, puedes completar la solicitud con tus documentos.')}</Text>
          <Text style={styles.text}>{t('Mensaje para administración (opcional)')}</Text>
          <TextInput multiline maxLength={500} editable={!busy} value={message} onChangeText={setMessage}
            accessibilityLabel={t('Mensaje para administración (opcional)')} style={styles.input}
            placeholder={t('Por ejemplo: qué tipo de trabajos quieres publicar')} placeholderTextColor={colors.muted} />
          <TouchableOpacity style={styles.button} disabled={busy} onPress={send} accessibilityRole="button">
            {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{t('Enviar solicitud')}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} disabled={busy} onPress={onClose}><Text style={styles.text}>{t('Cancelar')}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099' }, scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.background, borderRadius: 20, padding: 22, gap: 16 }, title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  text: { color: colors.text, lineHeight: 21 }, input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.text, minHeight: 100, padding: 14, textAlignVertical: 'top' },
  button: { minHeight: 52, backgroundColor: colors.primary, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: colors.onPrimary, fontWeight: '700' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
