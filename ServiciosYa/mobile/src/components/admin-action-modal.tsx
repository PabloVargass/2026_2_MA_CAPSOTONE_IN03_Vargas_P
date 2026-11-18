import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';

// deactivation: pide además el estado (inactiva o bloqueada) y el mensaje que verá la persona.
export type AdminAction = { title: string; explanation: string; path: string; body: Record<string, unknown>; deactivation?: boolean };

export function AdminActionModal({ action, onClose, onSuccess }: { action: AdminAction; onClose: () => void; onSuccess: () => void }) {
  const { t, colors } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [reason, setReason] = useState('');
  const [kind, setKind] = useState<'INACTIVA' | 'BLOQUEADA'>('INACTIVA');
  const [userMessage, setUserMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (busy) return;
    if (action.deactivation && userMessage.trim().length < 5) { Alert.alert(t('Mensaje requerido'), t('Escribe el mensaje que verá la persona, de al menos 5 caracteres.')); return; }
    if (reason.trim().length < 5) { Alert.alert(t('Motivo requerido'), t('Escribe un motivo de al menos 5 caracteres.')); return; }
    setBusy(true);
    try {
      const extra = action.deactivation ? { tipoDesactivacion: kind, mensajeUsuario: userMessage.trim() } : {};
      await authenticatedApi(action.path, 'PATCH', { ...action.body, ...extra, motivo: reason.trim() });
      onSuccess();
    } catch (error) { Alert.alert(t('No se pudo realizar el cambio'), error instanceof Error ? error.message : t('Error de conexión')); }
    finally { setBusy(false); }
  }
  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t(action.title)}</Text>
          <Text style={styles.text}>{t(action.explanation)}</Text>
          {action.deactivation && <>
            <Text style={styles.text}>{t('Estado de la cuenta')}</Text>
            <View style={styles.choices}>
              {(['INACTIVA', 'BLOQUEADA'] as const).map(value => <TouchableOpacity key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{ selected: kind === value }} onPress={() => setKind(value)}
                style={[styles.choice, kind === value && { borderColor: colors.accent, backgroundColor: colors.surface }]}>
                <Text style={styles.choiceTitle}>{t(value === 'INACTIVA' ? 'Inactiva' : 'Bloqueada')}</Text>
                <Text style={styles.help}>{t(value === 'INACTIVA' ? 'Suspensión temporal' : 'Por infracción')}</Text>
              </TouchableOpacity>)}
            </View>
            <Text style={styles.text}>{t('Mensaje que verá la persona al iniciar sesión')}</Text>
            <TextInput multiline maxLength={300} editable={!busy} value={userMessage} onChangeText={setUserMessage}
              accessibilityLabel={t('Mensaje que verá la persona al iniciar sesión')} style={styles.input} placeholder={t('Mensaje para la persona')} placeholderTextColor={colors.muted} />
          </>}
          <Text style={styles.text}>{t('Motivo del cambio')}{action.deactivation ? ` (${t('interno, queda en auditoría')})` : ''}</Text>
          <TextInput autoFocus={!action.deactivation} multiline maxLength={500} editable={!busy} value={reason} onChangeText={setReason}
            accessibilityLabel={t('Motivo del cambio')} style={styles.input} placeholder={t('Motivo del cambio')} placeholderTextColor={colors.muted} />
          <TouchableOpacity style={styles.button} disabled={busy} onPress={submit}>{busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>{t('Confirmar cambio')}</Text>}</TouchableOpacity>
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
  choices: { flexDirection: 'row', gap: 10 }, choice: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, gap: 4 },
  choiceTitle: { color: colors.text, fontWeight: '700' }, help: { color: colors.muted, fontSize: 13 },
});
