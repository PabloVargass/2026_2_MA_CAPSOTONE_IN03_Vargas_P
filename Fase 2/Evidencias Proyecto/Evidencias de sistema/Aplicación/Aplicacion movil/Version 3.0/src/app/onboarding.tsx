import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Animated, BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { SearchFilterSelect } from '@/components/search-filter-select';
import type { AppColors } from '@/constants/app-theme';
import { generalServiceCategories } from '@/constants/service-categories';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { Availability, BudgetRange, UserGoal, UserPreferences } from '@/services/affinity';
import { chileRegions } from '@/services/publication-search';
import { getPreferences, savePreferences, skipPreferences } from '@/services/user-preferences';

const QUESTION_STEPS = 5;
const MAX_CATEGORIES = 10;

const goalOptions: { value: UserGoal; emoji: string; title: string; subtitle: string }[] = [
  { value: 'CONTRATAR', emoji: '🧰', title: 'Contratar servicios', subtitle: 'Busco personas que me ayuden con un trabajo.' },
  { value: 'TRABAJAR', emoji: '💼', title: 'Trabajar y ofrecer mis servicios', subtitle: 'Quiero postular a trabajos y generar ingresos.' },
  { value: 'AMBOS', emoji: '🔁', title: 'Ambas cosas', subtitle: 'A veces contrato y a veces trabajo.' },
];
const budgetOptions: { value: BudgetRange; bars: number; title: string }[] = [
  { value: 'HASTA_20000', bars: 1, title: 'Hasta $20.000' },
  { value: 'DE_20000_A_50000', bars: 2, title: 'Entre $20.000 y $50.000' },
  { value: 'DE_50000_A_100000', bars: 3, title: 'Entre $50.000 y $100.000' },
  { value: 'MAS_DE_100000', bars: 4, title: 'Más de $100.000' },
];
const availabilityOptions: { value: Availability; emoji: string; title: string; group: 'Días' | 'Horario' }[] = [
  { value: 'DIAS_SEMANA', emoji: '📅', title: 'Días de semana', group: 'Días' },
  { value: 'FIN_DE_SEMANA', emoji: '🌴', title: 'Fines de semana', group: 'Días' },
  { value: 'MANANA', emoji: '🌅', title: 'Mañana', group: 'Horario' },
  { value: 'TARDE', emoji: '☀️', title: 'Tarde', group: 'Horario' },
  { value: 'NOCHE', emoji: '🌙', title: 'Noche', group: 'Horario' },
];
const emptyAnswers: UserPreferences = { goal: 'AMBOS', categories: [], regionId: null, commune: null, budgetRange: null, availability: [] };

// Agrega o quita un valor de una selección múltiple, respetando un máximo.
const toggleSelection = <T,>(list: T[], value: T, max = Number.POSITIVE_INFINITY): T[] =>
  list.includes(value) ? list.filter(item => item !== value) : list.length >= max ? list : [...list, value];

// Paso 0: bienvenida; 1-5: preguntas; 6: final. El objetivo se marca al elegirlo.
const canContinue = (step: number, answers: UserPreferences, goalChosen: boolean) => {
  if (step === 1) return goalChosen;
  if (step === 2) return answers.categories.length > 0;
  if (step === 3) return Boolean(answers.regionId);
  if (step === 4) return Boolean(answers.budgetRange);
  if (step === 5) return answers.availability.length > 0;
  return true;
};

export default function OnboardingScreen() {
  const { colors, t } = useAppPreferences();
  const styles = useThemedStyles(createStyles);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<UserPreferences>(emptyAnswers);
  const [goalChosen, setGoalChosen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SecureStore.getItemAsync('user').then(value => { try { setName(JSON.parse(value ?? '{}').name?.split(' ')[0] ?? ''); } catch { /* Sin nombre guardado. */ } }).catch(() => {});
    if (!editing) return;
    const controller = new AbortController();
    getPreferences(controller.signal)
      .then(status => { if (status.preferences) { setAnswers(status.preferences); setGoalChosen(true); } })
      .catch(() => { /* Sin respuestas previas se empieza en blanco. */ })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [editing]);

  useEffect(() => {
    Animated.timing(progress, { toValue: Math.min(step, QUESTION_STEPS) / QUESTION_STEPS, duration: 300, useNativeDriver: false }).start();
  }, [step, progress]);

  const exit = useCallback(() => {
    if (editing && router.canGoBack()) router.back();
    else router.replace('/(tabs)/home');
  }, [editing]);

  const goBack = useCallback(() => {
    if (saving) return true;
    if (step > 0 && step <= QUESTION_STEPS) { setStep(step - 1); return true; }
    if (editing) { exit(); return true; }
    return step === 0;
  }, [step, saving, editing, exit]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => subscription.remove();
  }, [goBack]);

  const skip = async () => {
    if (saving) return;
    setSaving(true);
    try { await skipPreferences(); } catch { /* Si falla, se volverá a ofrecer en el próximo ingreso. */ }
    setSaving(false);
    router.replace('/(tabs)/home');
  };

  const next = async () => {
    if (!canContinue(step, answers, goalChosen) || saving) return;
    if (step < QUESTION_STEPS) { setStep(step + 1); return; }
    if (step === QUESTION_STEPS) {
      setSaving(true);
      try {
        await savePreferences(answers);
        setStep(step + 1);
      } catch (error) {
        Alert.alert(t('Error'), t(error instanceof Error ? error.message : 'No se pudieron guardar tus preferencias.'));
      } finally {
        setSaving(false);
      }
      return;
    }
    exit();
  };

  const selectedRegion = chileRegions.find(region => region.id === answers.regionId);
  const enabled = canContinue(step, answers, goalChosen);
  const buttonLabel = step === 0 ? 'Comenzar' : step === QUESTION_STEPS ? 'Guardar' : step > QUESTION_STEPS ? 'Ver mis recomendaciones' : 'Continuar';

  const choice = (key: string, selected: boolean, onPress: () => void, content: ReactNode, multiple = false) =>
    <TouchableOpacity key={key} style={[styles.option, selected && styles.optionSelected]} activeOpacity={0.8} onPress={onPress}
      accessibilityRole={multiple ? 'checkbox' : 'radio'} accessibilityState={multiple ? { checked: selected } : { selected }}>
      {content}
      {multiple && <View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}</View>}
    </TouchableOpacity>;

  const renderStep = () => {
    if (step === 0) return <View style={styles.centerStep}>
      <OnboardingGuide layout="center" message={editing ? t('Actualiza tus respuestas y ajustaremos tus recomendaciones.') : t('¡Responde 5 preguntas cortas y te recomendaremos servicios a tu medida!')} />
    </View>;
    if (step > QUESTION_STEPS) return <View style={styles.centerStep}>
      <OnboardingGuide layout="center" mood="happy" message={name ? t('¡Listo, {name}! Ya preparamos tus recomendaciones.', { name }) : t('¡Listo! Ya preparamos tus recomendaciones.')} />
    </View>;

    if (step === 1) return <>
      <OnboardingGuide message={t('¿Qué quieres hacer en ServiciosYa?')} />
      <View style={styles.options}>{goalOptions.map(option => choice(option.value, goalChosen && answers.goal === option.value, () => { setAnswers({ ...answers, goal: option.value }); setGoalChosen(true); },
        <><Text style={styles.emoji}>{option.emoji}</Text><View style={styles.optionText}><Text style={styles.optionTitle}>{t(option.title)}</Text><Text style={styles.optionSubtitle}>{t(option.subtitle)}</Text></View></>))}</View>
    </>;
    if (step === 2) return <>
      <OnboardingGuide message={t('¿Qué tipos de servicios te interesan?')} />
      <Text style={styles.counter}>{t('{count} de {max} seleccionadas', { count: String(answers.categories.length), max: String(MAX_CATEGORIES) })}</Text>
      <View style={styles.options}>{generalServiceCategories.map(category => choice(category.name, answers.categories.includes(category.name),
        () => setAnswers({ ...answers, categories: toggleSelection(answers.categories, category.name, MAX_CATEGORIES) }),
        <><Text style={styles.emoji}>{category.emoji}</Text><Text style={[styles.optionTitle, styles.optionText]}>{category.name}</Text></>, true))}</View>
    </>;
    if (step === 3) return <>
      <OnboardingGuide message={t('¿Dónde te encuentras?')} />
      <View style={styles.options}>
        <SearchFilterSelect label="Región" value={answers.regionId ?? ''} emptyLabel="Selecciona una región" options={chileRegions.map(region => ({ value: region.id, label: region.name }))}
          onChange={value => setAnswers({ ...answers, regionId: value || null, commune: null })} />
        <SearchFilterSelect key={answers.regionId ?? ''} label="Comuna" value={answers.commune ?? ''} emptyLabel={selectedRegion ? 'Toda la región' : 'Selecciona una región primero'}
          options={(selectedRegion?.communes ?? []).map(item => ({ value: item.name, label: item.name }))} disabled={!selectedRegion} onChange={value => setAnswers({ ...answers, commune: value || null })} />
        <Text style={styles.hint}>{t('Las publicaciones cercanas aparecerán primero.')}</Text>
      </View>
    </>;
    if (step === 4) return <>
      <OnboardingGuide message={t(answers.goal === 'CONTRATAR' ? '¿Cuánto sueles pagar por un servicio?' : answers.goal === 'TRABAJAR' ? '¿Cuánto esperas cobrar por un trabajo?' : '¿En qué rango de precios te mueves?')} />
      <View style={styles.options}>{budgetOptions.map(option => choice(option.value, answers.budgetRange === option.value, () => setAnswers({ ...answers, budgetRange: option.value }),
        <><View style={styles.bars}>{[1, 2, 3, 4].map(bar => <View key={bar} style={[styles.bar, { height: 8 + bar * 6 }, bar <= option.bars && styles.barActive]} />)}</View>
          <Text style={[styles.optionTitle, styles.optionText]}>{t(option.title)}</Text></>))}</View>
    </>;
    return <>
      <OnboardingGuide message={t('¿Cuándo tienes disponibilidad?')} />
      {(['Días', 'Horario'] as const).map(group => <View key={group}>
        <Text style={styles.groupTitle}>{t(group)}</Text>
        <View style={styles.options}>{availabilityOptions.filter(option => option.group === group).map(option => choice(option.value, answers.availability.includes(option.value),
          () => setAnswers({ ...answers, availability: toggleSelection(answers.availability, option.value) }),
          <><Text style={styles.emoji}>{option.emoji}</Text><Text style={[styles.optionTitle, styles.optionText]}>{t(option.title)}</Text></>, true))}</View>
      </View>)}
    </>;
  };

  if (loading) return <SafeAreaView style={[styles.safeArea, styles.loading]}><ActivityIndicator color={colors.accent} /></SafeAreaView>;

  const showBack = (step > 0 && step <= QUESTION_STEPS) || (editing && step === 0);
  return <SafeAreaView style={styles.safeArea}>
    <View style={styles.header}>
      <TouchableOpacity style={[styles.back, !showBack && { opacity: 0 }]} disabled={!showBack || saving} onPress={goBack} accessibilityRole="button" accessibilityLabel={t('Volver')}>
        <Ionicons name="arrow-back" size={26} color={colors.muted} />
      </TouchableOpacity>
      <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: QUESTION_STEPS, now: Math.min(step, QUESTION_STEPS) }}>
        <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      {!editing && step <= QUESTION_STEPS
        ? <TouchableOpacity onPress={skip} disabled={saving} accessibilityRole="button"><Text style={styles.skip}>{t('Omitir')}</Text></TouchableOpacity>
        : <View style={styles.skipPlaceholder} />}
    </View>

    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{renderStep()}</ScrollView>

    <View style={styles.footer}>
      <TouchableOpacity style={[styles.button, !enabled && styles.buttonDisabled]} disabled={!enabled || saving} onPress={next} accessibilityRole="button" accessibilityState={{ disabled: !enabled || saving }}>
        {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.buttonText, !enabled && styles.buttonTextDisabled]}>{t(buttonLabel).toUpperCase()}</Text>}
      </TouchableOpacity>
    </View>
  </SafeAreaView>;
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loading: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  back: { padding: 4 },
  progressTrack: { flex: 1, height: 16, borderRadius: 8, backgroundColor: colors.elevated, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: colors.accent },
  skip: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  skipPlaceholder: { width: 8 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  centerStep: { flex: 1, justifyContent: 'center', paddingVertical: 40 },
  options: { marginTop: 22, gap: 12 },
  option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.border, backgroundColor: colors.background },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { flex: 1 },
  optionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  optionSubtitle: { color: colors.muted, fontSize: 13, marginTop: 3 },
  emoji: { fontSize: 28 },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, width: 40 },
  bar: { width: 7, borderRadius: 3, backgroundColor: colors.elevated },
  barActive: { backgroundColor: colors.accent },
  counter: { color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 16 },
  groupTitle: { color: colors.secondary, fontSize: 14, fontWeight: '800', marginTop: 22, marginBottom: -10 },
  hint: { color: colors.muted, fontSize: 13 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  button: { minHeight: 54, borderRadius: 14, borderBottomWidth: 4, borderBottomColor: 'rgba(0,0,0,0.25)', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: colors.elevated, borderBottomColor: colors.elevated },
  buttonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  buttonTextDisabled: { color: colors.muted },
});
