import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Share, Text, TextInput, View } from "react-native";
import { BadgeCheck, Check, Gift, Lock, Pin, Share2, Users } from "lucide-react-native";
import { Avatar } from "../components/Avatar";
import { WippBadge } from "../components/WippBadge";
import { Btn, GlassHeader, Header, Press, ScreenRoot } from "../components/ui";
import { shareWippPublic } from "../lib/share-public";
import { useWippStore } from "../lib/store";
import { APP_HOST } from "../lib/utils";
import { errorText } from "../lib/error-fr";
import { colors } from "../theme";

type Rewards = {
  code: string;
  badge: "blue" | "gold" | null;
  active: number;
  invited: number;
  canEnterCode: boolean;
  tiers: { friends: number; label: string; reached: boolean }[];
  friends: { displayName: string; username: string; avatarUrl: string | null; active: boolean }[];
  pins: { code: string; days: number; used: boolean; usedOn: string | null }[];
};

async function api<T>(path: string, init?: RequestInit) {
  const { wippApi } = await import("../lib/proximity/wipp-session");
  return wippApi<T>(path, init);
}

/** Keeps my own badge in the store, so the profile shows it too. */
function rememberMyBadge(badge: Rewards["badge"]) {
  useWippStore.setState((s) => (s.me.badge === badge ? s : { me: { ...s.me, badge } }));
}

export async function refreshMyBadge() {
  try {
    const r = await api<Rewards>("rewards");
    rememberMyBadge(r.badge);
  } catch {
    /* Offline: keep the last known badge. */
  }
}

export function RewardsScreen() {
  const pop = useWippStore((s) => s.pop);
  const [data, setData] = useState<Rewards | null>(null);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<Rewards>("rewards");
      setData(r);
      setError("");
      rememberMyBadge(r.badge);
    } catch (err) {
      setError(errorText(err, "Impossible de charger tes récompenses."));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function shareLink() {
    if (!data) return;
    const link = `https://${APP_HOST}/@${data.code}`;
    await shareWippPublic(`Rejoins-moi sur WIPP ! Télécharge l’app, et à l’inscription entre mon code d’invitation : @${data.code}\n${link}`);
  }

  async function sendInviteCode() {
    const code = inviteCode.trim();
    if (!code || busy) return;
    setBusy(true);
    try {
      await api("rewards/referrer", { method: "POST", body: JSON.stringify({ code }) });
      setInviteCode("");
      Alert.alert("Merci !", `Tu as été invité(e) par ${code.startsWith("@") ? code : `@${code}`}. Ton ami(e) avance vers ses récompenses dès ton premier message.`);
      void load();
    } catch (err) {
      Alert.alert("Code d’invitation", errorText(err, "Code impossible à enregistrer."));
    } finally {
      setBusy(false);
    }
  }

  async function redeem(code: string) {
    if (!code.trim() || busy) return;
    setBusy(true);
    try {
      const r = await api<{ name: string; days: number; pinnedUntil: string | null }>("rewards/redeem", { method: "POST", body: JSON.stringify({ code }) });
      setPinCode("");
      const until = r.pinnedUntil ? new Date(r.pinnedUntil).toLocaleDateString("fr-FR") : "";
      Alert.alert("Entreprise épinglée", `« ${r.name} » est épinglée en haut d’Explorer pendant ${r.days} jours${until ? ` (jusqu’au ${until})` : ""}.`);
      void load();
    } catch (err) {
      Alert.alert("Code d’épinglage", errorText(err, "Code impossible à utiliser."));
    } finally {
      setBusy(false);
    }
  }

  function pinOptions(pin: Rewards["pins"][number]) {
    Alert.alert(`Code ${pin.days} jours`, pin.code, [
      { text: "Épingler mon entreprise", onPress: () => void redeem(pin.code) },
      {
        text: "Offrir ce code",
        onPress: () => void Share.share({ message: `Je t’offre ${pin.days} jours d’épinglage de ton entreprise sur WIPP ! Dans WIPP : Profil › Gagne des récompenses › J’ai un code d’épinglage, puis entre : ${pin.code}` }),
      },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  const next = data?.tiers.find((t) => !t.reached);
  const goal = next?.friends ?? data?.tiers[data.tiers.length - 1]?.friends ?? 10;
  const progress = data ? Math.min(1, data.active / goal) : 0;

  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title="Gagne des récompenses" onBack={pop} />
      </GlassHeader>
      {!data ? (
        <View style={{ padding: 24, alignItems: "center", gap: 12 }}>
          {error ? (
            <>
              <Text style={{ color: colors.muted, textAlign: "center" }}>{error}</Text>
              <Btn label="Réessayer" onPress={() => void load()} />
            </>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={{ borderRadius: 18, backgroundColor: colors.navy, padding: 18, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Gift size={22} color={colors.accent} />
              <Text style={{ flex: 1, color: "#fff", fontSize: 18, fontFamily: "Inter_600SemiBold" }}>Invite tes amis sur WIPP</Text>
              <WippBadge badge={data.badge} size={22} />
            </View>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 20 }}>
              Un ami compte quand il entre ton code à l’inscription et que vous êtes en contact sur WIPP (connectés, ou un message chacun).
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <Text style={{ color: colors.accent, fontSize: 34, fontFamily: "Inter_600SemiBold" }}>{data.active}</Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 15 }}>
                {next ? `/ ${next.friends} amis — prochaine : ${next.label}` : "amis — toutes les récompenses débloquées !"}
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
              <View style={{ width: `${Math.round(progress * 100)}%`, height: "100%", backgroundColor: colors.accent }} />
            </View>
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", padding: 12, alignItems: "center" }}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Ton code d’invitation</Text>
              <Text selectable style={{ color: "#fff", fontSize: 22, fontFamily: "Inter_600SemiBold", marginTop: 2 }}>@{data.code}</Text>
            </View>
            <Btn label="Partager mon invitation" onPress={() => void shareLink()} />
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Les récompenses</Text>
            {data.tiers.map((tier) => (
              <View key={tier.friends} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: tier.reached ? colors.accent : colors.hair, backgroundColor: colors.surface, padding: 14 }}>
                {tier.friends === 3 ? <BadgeCheck size={24} color="#ffffff" fill="#1d9bf0" /> : <Pin size={22} color={colors.accent} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{tier.label}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{tier.friends} amis actifs</Text>
                </View>
                {tier.reached ? <Check size={20} color={colors.accent} /> : <Lock size={18} color={colors.muted} />}
              </View>
            ))}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, padding: 14 }}>
              <BadgeCheck size={24} color="#ffffff" fill="#d4a017" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>Badge doré</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Réservé aux comptes certifiés par l’équipe WIPP.</Text>
              </View>
            </View>
          </View>

          {data.pins.length ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Mes codes d’épinglage</Text>
              {data.pins.map((pin) => (
                <Press key={pin.code} disabled={pin.used} onPress={() => pinOptions(pin)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair, padding: 14, opacity: pin.used ? 0.6 : 1 }}>
                  <Pin size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text selectable style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{pin.code}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {pin.used ? `Utilisé${pin.usedOn ? ` pour « ${pin.usedOn} »` : ""}` : `${pin.days} jours · touche pour l’utiliser ou l’offrir`}
                    </Text>
                  </View>
                  {!pin.used ? <Share2 size={18} color={colors.muted} /> : null}
                </Press>
              ))}
            </View>
          ) : null}

          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>J’ai un code d’épinglage</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Un code offert par un ami épingle ta page Entreprise en haut d’Explorer.</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={pinCode}
                onChangeText={setPinCode}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="WIPP-XXXX-XXXX"
                placeholderTextColor={colors.muted}
                style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, color: colors.fg, paddingHorizontal: 12 }}
              />
              <Btn label="Valider" onPress={() => void redeem(pinCode)} />
            </View>
          </View>

          {data.canEnterCode ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Quelqu’un t’a invité(e) ?</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>Entre son @pseudo pendant ta première semaine sur WIPP.</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="@pseudo"
                  placeholderTextColor={colors.muted}
                  style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, color: colors.fg, paddingHorizontal: 12 }}
                />
                <Btn label="Valider" onPress={() => void sendInviteCode()} />
              </View>
            </View>
          ) : null}

          {data.friends.length ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Users size={18} color={colors.fg} />
                <Text style={{ color: colors.fg, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Mes invités ({data.invited})</Text>
              </View>
              {data.friends.map((f) => (
                <View key={f.username} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
                  <Avatar user={{ displayName: f.displayName, avatar: f.avatarUrl ?? undefined }} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.fg, fontFamily: "Inter_500Medium" }}>{f.displayName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>@{f.username}</Text>
                  </View>
                  <Text style={{ color: f.active ? colors.accent : colors.muted, fontSize: 12 }}>{f.active ? "Actif" : "Pas encore en contact"}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>
            Les récompenses sont gratuites et ne s’échangent pas contre de l’argent. Seuls les amis en contact avec toi comptent (20 par mois au maximum). Les comptes faux, suspendus ou en double ne comptent pas.
          </Text>
        </ScrollView>
      )}
    </ScreenRoot>
  );
}
