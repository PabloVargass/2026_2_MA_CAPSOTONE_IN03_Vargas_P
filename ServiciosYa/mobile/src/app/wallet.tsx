import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '@/constants/app-theme';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import { authenticatedApi } from '@/services/authenticated-api';
import { clp } from '@/components/payment-modal';

type Movement = { id: string; jobTitle: string; counterpart: string; method: 'SALDO' | 'TRANSFERENCIA'; amount: number; commission?: number; workerAmount?: number; createdAt: string };
type Wallet = { balance: number; received: Movement[]; paid: Movement[] };

// Billetera simulada: se actualiza cada 3 segundos para mostrar los pagos en tiempo real.
export default function WalletScreen() {
  const router = useRouter();
  const { t, colors, locale } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const [data, setData] = useState<Wallet | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Movement | null>(null);
  const known = useRef<Set<string> | null>(null);
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const [shownBalance, setShownBalance] = useState(0);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = balanceAnim.addListener(({ value }) => setShownBalance(value));
    return () => balanceAnim.removeListener(id);
  }, [balanceAnim]);

  const load = useCallback(async () => {
    try {
      const w = await authenticatedApi<Wallet>('/pagos/billetera');
      setError('');
      const firstLoad = known.current === null;
      const fresh = firstLoad ? [] : w.received.filter(m => !known.current!.has(m.id));
      known.current = new Set(w.received.map(m => m.id));
      setData(w);
      Animated.timing(balanceAnim, { toValue: w.balance, duration: firstLoad ? 600 : 1400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      if (fresh.length) {
        setToast(fresh[0]);
        toastAnim.setValue(0);
        Animated.sequence([
          Animated.spring(toastAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
          Animated.delay(3500),
          Animated.timing(toastAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }
    } catch (e) { setError(e instanceof Error ? e.message : t('Error de conexión')); }
  }, [balanceAnim, toastAnim, t]);

  useFocusEffect(useCallback(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [load]));

  const date = (iso: string) => new Date(iso).toLocaleString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Volver')}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('Billetera')}</Text>
        <View style={styles.spacer} />
      </View>
      <Text style={styles.subtitle}>{t('Pagos simulados de tus servicios')}</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('Saldo ServiciosYa')}</Text>
        {data ? <Text style={styles.balance}>{clp(shownBalance)}</Text> : <ActivityIndicator color={colors.accent} />}
        <Text style={styles.live}>● {t('Se actualiza en tiempo real')}</Text>
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.section}>{t('Pagos recibidos')}</Text>
      {data?.received.length ? data.received.map(m => <View key={m.id} style={styles.item}>
        <View style={[styles.icon, { backgroundColor: 'rgba(74, 222, 128, 0.12)' }]}><Ionicons name="arrow-down" size={20} color={colors.successText} /></View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{m.jobTitle}</Text>
          <Text style={styles.itemSub}>{t('De {name}', { name: m.counterpart })} · {t(m.method === 'SALDO' ? 'Saldo' : 'Transferencia')} · {date(m.createdAt)}</Text>
          <Text style={styles.itemSub}>{t('Pagado {amount} · comisión {commission}', { amount: clp(m.amount), commission: clp(m.commission ?? 0) })}</Text>
        </View>
        <Text style={[styles.itemAmount, { color: colors.successText }]}>+{clp(m.workerAmount ?? m.amount)}</Text>
      </View>) : <Text style={styles.empty}>{t('Todavía no recibes pagos.')}</Text>}

      <Text style={styles.section}>{t('Pagos realizados')}</Text>
      {data?.paid.length ? data.paid.map(m => <View key={m.id} style={styles.item}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}><Ionicons name="arrow-up" size={20} color={colors.accent} /></View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>{m.jobTitle}</Text>
          <Text style={styles.itemSub}>{t('A {name}', { name: m.counterpart })} · {t(m.method === 'SALDO' ? 'Saldo' : 'Transferencia')} · {date(m.createdAt)}</Text>
        </View>
        <Text style={styles.itemAmount}>-{clp(m.amount)}</Text>
      </View>) : <Text style={styles.empty}>{t('Todavía no realizas pagos.')}</Text>}
      <Text style={styles.footer}>{t('Demostración: los pagos son simulados y no mueven dinero real.')}</Text>
    </ScrollView>

    {toast && <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }, { scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
      <Ionicons name="cash-outline" size={28} color={colors.onColor} />
      <View style={styles.itemInfo}>
        <Text style={styles.toastTitle}>{t('¡Recibiste {amount}!', { amount: clp(toast.workerAmount ?? toast.amount) })}</Text>
        <Text style={styles.toastSub}>{toast.jobTitle} · {toast.counterpart}</Text>
      </View>
    </Animated.View>}
  </SafeAreaView>;
}

const createStyles = (c: AppColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  spacer: { width: 44 },
  title: { color: c.text, fontSize: 21, fontWeight: '800' },
  subtitle: { color: c.muted, fontSize: 15, marginTop: 18, marginBottom: 20, textAlign: 'center' },
  balanceCard: { backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.accent, padding: 22, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { color: c.muted, fontSize: 15, fontWeight: '600' },
  balance: { color: c.text, fontSize: 40, fontWeight: '800', marginVertical: 8 },
  live: { color: c.successText, fontSize: 12, fontWeight: '600' },
  error: { color: c.dangerText, textAlign: 'center', marginBottom: 12 },
  section: { color: c.text, fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { color: c.text, fontSize: 15, fontWeight: '700' },
  itemSub: { color: c.muted, fontSize: 12, marginTop: 2 },
  itemAmount: { color: c.text, fontSize: 16, fontWeight: '800' },
  empty: { color: c.muted, fontSize: 14, marginBottom: 14 },
  footer: { color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 18 },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.success, borderRadius: 18, padding: 16, elevation: 8 },
  toastTitle: { color: c.onColor, fontSize: 17, fontWeight: '800' },
  toastSub: { color: c.onColor, fontSize: 13, opacity: 0.9 },
});
