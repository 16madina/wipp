import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import {
  confirmPhoneCode,
  firebasePhoneSupported,
  sendPhoneCode,
  type PhoneConfirmation,
} from '@/lib/firebase-phone';
import { ensureDemoSession, login, loginWithPhone, register } from '@/lib/api';

/**
 * Admin : numéro + mot de passe → panneau admin.
 * Utilisateurs : SMS Firebase (code).
 * Session persistante après connexion.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+225');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<PhoneConfirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'admin' | 'sms' | 'register'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  async function onAdminLogin() {
    setError('');
    setBusy(true);
    try {
      // Téléphone + MDP si ça ressemble à un numéro, sinon @username + MDP (1re fois)
      const looksPhone = /^\+?\d[\d\s.-]{6,}$/.test(phone.trim());
      if (looksPhone) {
        await loginWithPhone(phone.trim(), password);
      } else {
        await login(phone.trim().replace(/^@/, '') || 'admin', password);
      }
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  async function onSendCode() {
    setError('');
    setBusy(true);
    try {
      if (!firebasePhoneSupported()) {
        throw new Error('SMS disponible sur iOS/Android (build natif), pas sur le web Expo.');
      }
      const conf = await sendPhoneCode(phone);
      setConfirmation(conf);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi SMS impossible');
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm() {
    if (!confirmation) return;
    setError('');
    setBusy(true);
    try {
      await confirmPhoneCode(confirmation, code);
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Code incorrect');
    } finally {
      setBusy(false);
    }
  }

  async function onRegister() {
    setError('');
    setBusy(true);
    try {
      const u = username.trim().replace(/^@/, '');
      await register({
        username: u,
        password,
        displayName: displayName.trim() || u,
      });
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inscription impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>wipp</Text>
      <Text style={styles.tag}>Connecte ta vie.</Text>
      <Text style={styles.sub}>
        Admin : ton numéro + mot de passe. Ensuite tu restes connecté sur cet appareil.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === 'admin' && styles.tabOn]}
          onPress={() => setMode('admin')}
        >
          <Text style={styles.tabTxt}>Admin</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'sms' && styles.tabOn]}
          onPress={() => setMode('sms')}
        >
          <Text style={styles.tabTxt}>SMS</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === 'register' && styles.tabOn]}
          onPress={() => setMode('register')}
        >
          <Text style={styles.tabTxt}>Créer</Text>
        </Pressable>
      </View>

      {mode === 'admin' ? (
        <>
          <Text style={styles.hint}>
            Numéro lié à l’admin (ou @admin la 1re fois) + mot de passe
          </Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="+225… ou @admin"
            placeholderTextColor="#8b93a7"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Mot de passe"
            placeholderTextColor="#8b93a7"
          />
          <Pressable style={styles.cta} disabled={busy} onPress={() => void onAdminLogin()}>
            {busy ? (
              <ActivityIndicator color="#0B1220" />
            ) : (
              <Text style={styles.ctaTxt}>Ouvrir mon compte admin</Text>
            )}
          </Pressable>
        </>
      ) : null}

      {mode === 'sms' ? (
        <>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+225…"
            placeholderTextColor="#8b93a7"
            editable={!confirmation}
          />
          {confirmation ? (
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              placeholder="Code SMS"
              placeholderTextColor="#8b93a7"
            />
          ) : null}
          <Pressable
            style={styles.cta}
            disabled={busy}
            onPress={() => void (confirmation ? onConfirm() : onSendCode())}
          >
            {busy ? (
              <ActivityIndicator color="#0B1220" />
            ) : (
              <Text style={styles.ctaTxt}>{confirmation ? 'Valider' : 'Recevoir le SMS'}</Text>
            )}
          </Pressable>
        </>
      ) : null}

      {mode === 'register' ? (
        <>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Nom affiché"
            placeholderTextColor="#8b93a7"
          />
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="@username"
            placeholderTextColor="#8b93a7"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Mot de passe (6+)"
            placeholderTextColor="#8b93a7"
          />
          <Pressable style={styles.cta} disabled={busy} onPress={() => void onRegister()}>
            {busy ? (
              <ActivityIndicator color="#0B1220" />
            ) : (
              <Text style={styles.ctaTxt}>Créer mon compte</Text>
            )}
          </Pressable>
        </>
      ) : null}

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Pressable
        onPress={() =>
          void (async () => {
            setBusy(true);
            try {
              await ensureDemoSession();
              router.replace('/(tabs)');
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Démo indisponible');
            } finally {
              setBusy(false);
            }
          })()
        }
        style={styles.linkBtn}
      >
        <Text style={styles.link}>Continuer en démo (test)</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  brand: {
    color: Colors.dark.tint,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  tag: { color: '#f7f9fc', fontSize: 26, fontWeight: '700', marginTop: 8 },
  sub: { color: '#8b93a7', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  hint: { color: '#8b93a7', fontSize: 12, marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#121722',
  },
  tabOn: { backgroundColor: '#1c2433', borderWidth: 1, borderColor: Colors.dark.tint },
  tabTxt: { color: '#f7f9fc', fontWeight: '650' },
  input: {
    backgroundColor: '#121722',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f7f9fc',
    marginBottom: 12,
    fontSize: 16,
  },
  cta: {
    backgroundColor: Colors.dark.tint,
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ctaTxt: { color: '#0B1220', fontWeight: '700', fontSize: 16 },
  err: { color: '#ff5d73', marginTop: 14 },
  linkBtn: { marginTop: 22, alignItems: 'center' },
  link: { color: Colors.dark.tint, fontWeight: '600' },
});
