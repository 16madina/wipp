import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

const BG = '#070a0f';
const ACCENT = '#ffd84d';
const MUTED = '#8b93a7';
const FIELD = '#12141c';

const PAGES = [
  {
    title: 'Connectez-vous en',
    accent: 'un instant.',
    body: 'Approchez vos téléphones, échangez vos codes Wipp et commencez à discuter immédiatement — sans numéro de téléphone.',
  },
  {
    title: 'Les personnes sont plus proches que',
    accent: 'vous ne pensez.',
    body: 'Trouvez quelqu’un près de vous ou à l’autre bout du monde grâce au QR code, au pseudo ou aux fonctions de proximité.',
  },
  {
    title: 'Votre numéro reste',
    accent: 'votre affaire.',
    body: 'Connectez-vous avec votre Wipp, votre QR code ou votre @username. Vous décidez ce que vous partagez.',
  },
  {
    title: 'Des connexions qui vont',
    accent: 'plus loin.',
    body: 'Approchez vos téléphones, échangez vos codes Wipp et créez de nouvelles connexions — en un instant.',
  },
];

export default function OpenScreen() {
  const router = useRouter();
  const [step, setStep] = useState<'splash' | 'intro' | 'signup'>('splash');
  const [page, setPage] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => setStep('intro'), 2200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (step === 'splash') {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>wipp</Text>
        <Text style={styles.tag}>CONNECTE TA VIE</Text>
      </View>
    );
  }

  if (step === 'intro') {
    const slide = PAGES[page];
    const last = page === PAGES.length - 1;
    return (
      <View style={styles.screen}>
        <Pressable style={styles.skip} onPress={() => setStep('signup')}>
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
        <View style={styles.hero}>
          <Text style={styles.heroMark}>wipp</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {slide.title} <Text style={styles.accent}>{slide.accent}</Text>
          </Text>
          <Text style={styles.body}>{slide.body}</Text>
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <Pressable key={i} onPress={() => setPage(i)} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.row}>
            <Pressable disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))}>
              <Text style={[styles.back, page === 0 && styles.backOff]}>Retour</Text>
            </Pressable>
            <Pressable
              style={styles.next}
              onPress={() => {
                if (last) setStep('signup');
                else setPage((p) => p + 1);
              }}
            >
              <Text style={styles.nextText}>{last ? 'Commencer' : 'Suivant'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return <Signup onDone={() => router.replace('/(tabs)')} onLogin={() => router.replace('/login')} />;
}

function Signup({ onDone, onLogin }: { onDone: () => void; onLogin: () => void }) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  function submit() {
    if (!first.trim() || !last.trim() || !phone.trim()) {
      setError('Remplis ton prénom, ton nom et ton numéro.');
      return;
    }
    if (!accepted) {
      setError('Cochez pour créer le compte.');
      return;
    }
    onDone();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.signup}>
      <Text style={styles.logoSm}>wipp</Text>
      <Text style={styles.title}>
        Crée ton <Text style={styles.accent}>WIPP</Text>
      </Text>
      <Text style={styles.body}>Un seul compte pour communiquer, partager et découvrir tout ce qui t’importe.</Text>
      <Text style={styles.step}>Ton compte</Text>
      <View style={styles.pair}>
        <Field label="Prénom" value={first} onChange={setFirst} />
        <Field label="Nom" value={last} onChange={setLast} />
      </View>
      <Field label="Numéro de téléphone" value={phone} onChange={setPhone} keyboard="phone-pad" />
      <Text style={styles.hint}>Ton numéro reste privé sur WIPP. Il sert uniquement à sécuriser ton compte.</Text>
      <Pressable style={styles.checkRow} onPress={() => setAccepted((v) => !v)}>
        <View style={[styles.box, accepted && styles.boxOn]}>{accepted ? <Text style={styles.tick}>✓</Text> : null}</View>
        <Text style={styles.hint}>J’ai lu et j’accepte les Conditions d’utilisation et la Politique de confidentialité de WIPP.</Text>
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <Pressable style={styles.next} onPress={submit}>
        <Text style={styles.nextText}>Continuer</Text>
      </Pressable>
      <Pressable onPress={onLogin} style={styles.login}>
        <Text style={styles.hint}>
          Déjà un compte ? <Text style={styles.accent}>Se connecter</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'phone-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholderTextColor={MUTED}
        style={styles.field}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#02081e', alignItems: 'center', justifyContent: 'center' },
  logo: { color: '#fff', fontSize: 64, fontWeight: '800', letterSpacing: -2 },
  tag: { marginTop: 12, color: ACCENT, letterSpacing: 3, fontSize: 13, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: BG },
  skip: { position: 'absolute', top: 56, right: 20, zIndex: 2 },
  skipText: { color: '#fff', fontSize: 15 },
  hero: { height: '46%', backgroundColor: '#10182e', alignItems: 'center', justifyContent: 'center' },
  heroMark: { color: ACCENT, fontSize: 42, fontWeight: '800' },
  copy: { flex: 1, paddingHorizontal: 22, paddingTop: 22 },
  title: { color: '#f4f6fb', fontSize: 28, fontWeight: '700', lineHeight: 34 },
  accent: { color: ACCENT },
  body: { marginTop: 10, color: MUTED, fontSize: 15, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 22 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2a3142' },
  dotOn: { width: 22, backgroundColor: ACCENT },
  row: { marginTop: 'auto', marginBottom: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#fff', fontSize: 16 },
  backOff: { opacity: 0.3 },
  next: { marginTop: 18, backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 14, alignItems: 'center' },
  nextText: { color: '#1a1400', fontWeight: '700', fontSize: 16 },
  signup: { paddingHorizontal: 22, paddingTop: 64, paddingBottom: 40 },
  logoSm: { color: ACCENT, fontSize: 28, fontWeight: '800' },
  step: { marginTop: 22, marginBottom: 8, color: '#f4f6fb', fontWeight: '600' },
  pair: { flexDirection: 'row', gap: 10 },
  fieldWrap: { flex: 1, marginTop: 12 },
  label: { color: MUTED, fontSize: 12, marginBottom: 6 },
  field: { height: 48, borderRadius: 16, backgroundColor: FIELD, color: '#fff', paddingHorizontal: 14, fontSize: 16 },
  hint: { flex: 1, marginTop: 8, color: MUTED, fontSize: 12, lineHeight: 18 },
  checkRow: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'flex-start' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  tick: { color: '#1a1400', fontWeight: '800' },
  err: { color: '#ff6b6b', marginTop: 10 },
  login: { alignItems: 'center', marginTop: 16 },
});
