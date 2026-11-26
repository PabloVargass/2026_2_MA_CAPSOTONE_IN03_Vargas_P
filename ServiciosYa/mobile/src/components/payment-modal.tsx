import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { authenticatedApi } from '@/services/authenticated-api';

// Pago SIMULADO al confirmar el término de un trabajo: no mueve dinero real.
// Datos bancarios ficticios de la plataforma, que recibe la transferencia y abona al trabajador.
const TRANSFER_DATA = [
  ['Titular', 'ServiciosYa SpA (simulado)'],
  ['Banco', 'Banco Demo'],
  ['Tipo de cuenta', 'Cuenta corriente'],
  ['Número', '00-123-45678-9'],
  ['RUT', '76.000.000-0'],
];

type Method = 'SALDO' | 'TRANSFERENCIA';
type PayResult = { pago: { method: Method; amount: number; commission: number; workerAmount: number }; balance: number };

export const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

export function PaymentModal({ jobId, title, amount, onClose, onPaid }: { jobId: string; title: string; amount: number; onClose: () => void; onPaid: () => void }) {
  const { t, colors } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [balance, setBalance] = useState<number | null>(null);
  const [step, setStep] = useState<'choose' | 'transfer' | 'done'>('choose');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PayResult | null>(null);
  const scale = useRef(new Animated.Value(0)).current;
  const counter = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    authenticatedApi<{ balance: number }>('/pagos/billetera').then(r => setBalance(r.balance)).catch(() => setBalance(0));
  }, []);

  useEffect(() => {
    const id = counter.addListener(({ value }) => setShown(value));
    return () => counter.removeListener(id);
  }, [counter]);

  async function pay(method: Method) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await authenticatedApi<PayResult>(`/pagos/trabajos/${jobId}`, 'POST', { metodo: method });
      setResult(r);
      setStep('done');
      scale.setValue(0); counter.setValue(0);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
        Animated.timing(counter, { toValue: r.pago.amount, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start();
    } catch (error) {
      Alert.alert(t('No se pudo realizar el pago'), error instanceof Error ? t(error.message) : t('Error de conexión'));
    } finally { setBusy(false); }
  }

  const enoughBalance = balance !== null && balance >= amount;

  return <Modal transparent animationType="fade" onRequestClose={() => { if (!busy) (step === 'done' ? onPaid() : onClose()); }}>
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          {step === 'done' && result ? <>
            <Animated.View style={[styles.okCircle, { transform: [{ scale }] }]}>
              <Ionicons name="checkmark" size={56} color={colors.onColor} />
            </Animated.View>
            <Text style={styles.title}>{t('¡Pago realizado!')}</Text>
            <Text style={styles.big}>{clp(shown)}</Text>
            <Text style={styles.text}>{t(result.pago.method === 'SALDO' ? 'Pagado con saldo ServiciosYa' : 'Pagado por transferencia')}</Text>
            <View style={styles.box}>
              <Row label={t('Recibe el trabajador')} value={clp(result.pago.workerAmount)} styles={styles} />
              <Row label={t('Comisión ServiciosYa (5 %)')} value={clp(result.pago.commission)} styles={styles} />
              {result.pago.method === 'SALDO' && <Row label={t('Tu saldo restante')} value={clp(result.balance)} styles={styles} />}
            </View>
            <Text style={styles.note}>{t('El trabajo quedó completado. Ya puedes calificar al trabajador.')}</Text>
            <TouchableOpacity style={styles.primary} onPress={onPaid}><Text style={styles.primaryText}>{t('Listo')}</Text></TouchableOpacity>
          </> : step === 'transfer' ? <>
            <Text style={styles.title}>{t('Transferencia bancaria')}</Text>
            <Text style={styles.text}>{t('Transfiere {amount} a la cuenta de ServiciosYa. La plataforma abona el pago al trabajador.', { amount: clp(amount) })}</Text>
            <View style={styles.box}>{TRANSFER_DATA.map(([k, v]) => <Row key={k} label={t(k)} value={v} styles={styles} />)}</View>
            <Text style={styles.note}>{t('Demostración: no se realiza una transferencia real.')}</Text>
            <TouchableOpacity style={styles.primary} disabled={busy} onPress={() => pay('TRANSFERENCIA')}>
              {busy ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.primaryText}>{t('Ya transferí')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} disabled={busy} onPress={() => setStep('choose')}><Text style={styles.secondaryText}>{t('Volver')}</Text></TouchableOpacity>
          </> : <>
            <Text style={styles.title}>{t('Pagar el servicio')}</Text>
            <Text style={styles.text}>{title}</Text>
            <Text style={styles.big}>{clp(amount)}</Text>
            <Text style={styles.note}>{t('Al pagar confirmas que el trabajo terminó.')}</Text>
            <TouchableOpacity style={[styles.option, !enoughBalance && styles.disabled]} disabled={busy || !enoughBalance} onPress={() => pay('SALDO')}>
              <Ionicons name="wallet-outline" size={26} color={colors.accent} />
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{t('Saldo ServiciosYa')}</Text>
                <Text style={styles.optionSub}>{balance === null ? t('Consultando saldo…') : t('Disponible: {amount}', { amount: clp(balance) })}{balance !== null && !enoughBalance ? ' · ' + t('Saldo insuficiente') : ''}</Text>
              </View>
              {busy ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="chevron-forward" size={20} color={colors.muted} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.option} disabled={busy} onPress={() => setStep('transfer')}>
              <Ionicons name="swap-horizontal-outline" size={26} color={colors.accent} />
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{t('Transferencia bancaria')}</Text>
                <Text style={styles.optionSub}>{t('Ver los datos de la cuenta')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} disabled={busy} onPress={onClose}><Text style={styles.secondaryText}>{t('Cancelar')}</Text></TouchableOpacity>
          </>}
        </View>
      </ScrollView>
    </View>
  </Modal>;
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof createStyles> }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const createStyles = (c: AppColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.78)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: c.surface, borderRadius: 24, borderWidth: 1, borderColor: c.border, padding: 22, alignItems: 'stretch' },
  title: { color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  text: { color: c.secondary, fontSize: 15, textAlign: 'center', marginBottom: 6 },
  big: { color: c.accent, fontSize: 38, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  note: { color: c.muted, fontSize: 13, textAlign: 'center', marginVertical: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.elevated, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 16, marginTop: 10 },
  disabled: { opacity: 0.5 },
  optionInfo: { flex: 1 },
  optionTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  optionSub: { color: c.muted, fontSize: 13, marginTop: 2 },
  box: { backgroundColor: c.elevated, borderRadius: 16, padding: 14, marginTop: 10, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: c.muted, fontSize: 14, flexShrink: 1 },
  rowValue: { color: c.text, fontSize: 14, fontWeight: '700', textAlign: 'right', flexShrink: 1 },
  primary: { backgroundColor: c.accent, borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  primaryText: { color: c.onPrimary, fontSize: 16, fontWeight: '800' },
  secondary: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  secondaryText: { color: c.muted, fontSize: 15, fontWeight: '600' },
  okCircle: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
});
