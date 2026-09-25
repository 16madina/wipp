import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const HUBS = [
  { id: 'listings', title: 'Petites annonces', sub: 'Acheter, vendre, trouver.', rows: ['Honda Civic 2024', '4 ½ lumineux près du métro', 'Fauteuil cuir vintage'] },
  { id: 'utilities', title: 'Services', sub: 'Tout ce qui est utile autour de vous.', rows: ['Jean Coutu', 'Pharmaprix', 'Familiprix'] },
  { id: 'shops', title: 'Boutiques', sub: 'Découvrez les commerces près de chez vous.', rows: ['Onglerie', 'Boulangerie', 'Café'] },
  { id: 'lifestyle', title: 'Événements', sub: 'Découvrez ce qui se passe autour de vous.', rows: ['Soirée samedi', 'Soccer Longueuil', 'Concert'] },
] as const;

export default function ExploreScreen() {
  const [hub, setHub] = useState<(typeof HUBS)[number]['id'] | 'home'>('home');
  const [q, setQ] = useState('');
  const current = HUBS.find((h) => h.id === hub);

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        {hub !== 'home' ? (
          <Pressable onPress={() => setHub('home')}>
            <Text style={styles.back}>Retour</Text>
          </Pressable>
        ) : null}
        <Text style={styles.title}>{current?.title ?? 'Explorer'}</Text>
      </View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Que cherchez-vous aujourd’hui ?"
        placeholderTextColor="#8b93a7"
        style={styles.search}
      />
      <ScrollView contentContainerStyle={styles.body}>
        {hub === 'home' ? (
          <>
            <Text style={styles.lead}>Wipp, c’est pour écrire. Ici, vous découvrez ce qui existe autour de vous.</Text>
            <View style={styles.grid}>
              {HUBS.map((item) => (
                <Pressable key={item.id} style={styles.card} onPress={() => setHub(item.id)}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSub}>{item.sub}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.rail}>Près de vous</Text>
            {['Jean Coutu', 'Soccer Longueuil', '4 ½ lumineux près du métro'].map((name) => (
              <View key={name} style={styles.row}>
                <View style={styles.thumb} />
                <Text style={styles.rowTitle}>{name}</Text>
              </View>
            ))}
          </>
        ) : (
          current?.rows
            .filter((row) => row.toLowerCase().includes(q.trim().toLowerCase()))
            .map((row) => (
              <View key={row} style={styles.row}>
                <View style={styles.thumb} />
                <View>
                  <Text style={styles.rowTitle}>{row}</Text>
                  <Text style={styles.cardSub}>Longueuil</Text>
                </View>
              </View>
            ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070a0f' },
  head: { paddingTop: 18, paddingHorizontal: 18, gap: 6 },
  back: { color: '#ffd84d', fontSize: 15 },
  title: { color: '#f4f6fb', fontSize: 28, fontWeight: '700' },
  search: {
    margin: 16,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#121722',
    color: '#fff',
    paddingHorizontal: 16,
  },
  body: { paddingHorizontal: 16, paddingBottom: 28 },
  lead: { color: '#8b93a7', lineHeight: 20, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', backgroundColor: '#121722', borderRadius: 18, padding: 14, minHeight: 108, justifyContent: 'flex-end' },
  cardTitle: { color: '#f4f6fb', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#8b93a7', fontSize: 12, marginTop: 4 },
  rail: { color: '#8b93a7', marginTop: 22, marginBottom: 8, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#121722', borderRadius: 16, padding: 12, marginBottom: 8 },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#1c2740' },
  rowTitle: { color: '#f4f6fb', fontSize: 15, fontWeight: '600' },
});
