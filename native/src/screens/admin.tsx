import { WippBadge } from "../components/WippBadge";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from "react-native";
import { Avatar } from "../components/Avatar";
import { Sheet } from "../components/card-editor-parts";
import { Btn, Chip, Empty, GlassHeader, Header, Press, ScreenRoot, SearchField } from "../components/ui";
import { wippApi } from "../lib/proximity/wipp-session";
import { useWippStore } from "../lib/store";
import { colors, accentA, whiteA } from "../theme";
import { tr, trLocale } from "../lib/tr";

type Role = "admin" | "moderator" | null;
type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string | null;
  role: "admin" | "moderator" | "user";
  createdAt: number;
  suspendedAt: number | null;
  suspendedReason: string | null;
  badge?: "blue" | "gold" | null;
};
type Report = {
  id: string;
  targetType: string;
  targetId: string;
  targetProfileId?: string | null;
  targetUsername: string | null;
  reporter: string | null;
  reason: string;
  status: string;
  hasContent: boolean;
  /** Story, listing or shop: can be taken down from here. */
  removable?: boolean;
  createdAt: number;
};

const REPORT_TYPE: Record<string, string> = {
  get message() { return tr("Message"); },
  get story() { return tr("Story"); },
  get profile() { return tr("Profil"); },
  get listing() { return tr("Annonce"); },
  get business_card() { return tr("Entreprise"); },
  get group() { return tr("Groupe"); },
};
const REPORT_STATUS: Record<string, string> = { get open() { return tr("ouvert"); }, get resolved() { return tr("traité"); }, get dismissed() { return tr("classé"); } };
type Template = { id: string; label: string; title: string; body: string };
type Tab = "stats" | "referrers" | "users" | "messages" | "reports" | "suspended" | "push" | "audit";

const api = <T,>(path: string, body?: unknown, method?: string) =>
  wippApi<T>(`staff/${path}`, body === undefined ? { method: method ?? "GET" } : { method: method ?? "POST", body: JSON.stringify(body) });

function when(ms: number) {
  return new Date(ms).toLocaleString(trLocale(), { dateStyle: "short", timeStyle: "short" });
}

function fail(err: unknown) {
  Alert.alert(tr("Admin"), (err as Error)?.message || tr("Action impossible"));
}

/** Shown in "Moi" only for admins / moderators. */
export function useStaffRole() {
  const serverConnected = useWippStore((s) => s.serverConnected);
  const [role, setRole] = useState<Role>(null);
  useEffect(() => {
    if (!serverConnected) return;
    void api<{ role: Role }>("me")
      .then((r) => setRole(r.role))
      .catch(() => setRole(null));
  }, [serverConnected]);
  return role;
}

export function AdminScreen() {
  const pop = useWippStore((s) => s.pop);
  const role = useStaffRole();
  const [tab, setTab] = useState<Tab>("reports");
  useEffect(() => {
    if (role === "admin") setTab("stats");
  }, [role]);
  const tabs: [Tab, string][] =
    role === "admin"
      ? [
          ["stats", tr("📊 Statistiques")],
          ["users", tr("👥 Utilisateurs")],
          ["referrers", tr("🎁 Parrains")],
          ["messages", tr("💬 Messages")],
          ["reports", tr("🚩 Signalements")],
          ["suspended", tr("⛔ Suspendus")],
          ["push", tr("🔔 Notifications")],
          ["audit", tr("🧾 Journal")],
        ]
      : [
          ["reports", tr("🚩 Signalements")],
          ["suspended", tr("⛔ Suspendus")],
          ["users", tr("👥 Utilisateurs")],
        ];
  return (
    <ScreenRoot>
      <GlassHeader>
        <Header title={role === "moderator" ? tr("Modération") : tr("Admin panel")} onBack={pop} />
      </GlassHeader>
      {!role ? (
        <Empty title={tr("Accès réservé")} body={tr("Cet espace est réservé à l’administration de WIPP.")} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {tabs.map(([id, label]) => (
              <Chip key={id} label={label} active={tab === id} onPress={() => setTab(id)} />
            ))}
          </ScrollView>
          {tab === "stats" ? <StatsTab /> : null}
          {tab === "users" ? <UsersTab role={role} /> : null}
          {tab === "referrers" ? <ReferrersTab /> : null}
          {tab === "messages" ? <MessagesTab /> : null}
          {tab === "reports" ? <ReportsTab /> : null}
          {tab === "suspended" ? <SuspendedTab /> : null}
          {tab === "push" ? <PushTab /> : null}
          {tab === "audit" ? <AuditTab /> : null}
        </ScrollView>
      )}
    </ScreenRoot>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={{ borderRadius: 14, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.hair, padding: 14, gap: 6 }}>{children}</View>;
}

function StatsTab() {
  const [s, setS] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    void api<Record<string, number>>("overview").then(setS).catch(fail);
  }, []);
  if (!s) return <Text style={{ color: colors.muted }}>{tr("Chargement…")}</Text>;
  return (
    <View style={{ gap: 14 }}>
      <StatsGrid s={s} />
      <AdminPhoneCard />
    </View>
  );
}

/** From the old panel: the administrator's own login phone number. */
function AdminPhoneCard() {
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    void api<{ phone: string | null }>("phone")
      .then((r) => {
        setSaved(r.phone);
        setPhone(r.phone ?? "");
      })
      .catch(() => undefined);
  }, []);
  return (
    <Card>
      <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{tr("📱 Ton numéro admin")}</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Le numéro de connexion de ce compte administrateur.")}</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+1 819 …"
        placeholderTextColor={colors.muted}
        style={{ height: 44, borderRadius: 12, backgroundColor: whiteA(0.06), paddingHorizontal: 12, color: colors.fg }}
      />
      <Btn
        label={tr("Enregistrer le numéro")}
        variant="secondary"
        disabled={!phone.trim() || phone.replace(/\s/g, "") === (saved ?? "")}
        onPress={() =>
          void api<{ phone: string | null }>("phone", { phone }, "PUT")
            .then((r) => {
              setSaved(r.phone);
              Alert.alert(tr("Admin"), tr("Numéro enregistré."));
            })
            .catch(fail)
        }
      />
    </Card>
  );
}

function StatsGrid({ s }: { s: Record<string, number> }) {
  const items: [string, number, string][] = [
    ["👥", s.users, tr("Utilisateurs")],
    ["🆕", s.new_users_7d, tr("Nouveaux (7 j)")],
    ["⚡", s.new_users_24h, tr("Nouveaux (24 h)")],
    ["💬", s.messages_24h, tr("Messages (24 h)")],
    ["🗂️", s.chats, tr("Conversations")],
    ["🤝", s.connections, tr("Connexions actives")],
    ["⏳", s.ephemeral_connections, tr("Contacts éphémères")],
    ["🚩", s.open_reports, tr("Signalements ouverts")],
    ["⛔", s.suspended, tr("Comptes suspendus")],
    ["🛡️", s.moderators, tr("Modérateurs")],
    ["🔔", s.push_reachable, tr("Joignables par push")],
    ["✉️", s.messages, tr("Messages (total)")],
  ];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
      {items.map(([icon, n, label]) => (
        <View key={label} style={{ width: "48.5%", borderRadius: 14, backgroundColor: colors.navy, borderWidth: 1, borderColor: colors.hair, padding: 12 }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
          <Text style={{ marginTop: 4, color: colors.fg, fontSize: 22, fontFamily: "Inter_700Bold" }}>{n ?? 0}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Recent activity (from the old panel). Messages are end-to-end encrypted: only metadata is readable. */
function MessagesTab() {
  const [rows, setRows] = useState<{ id: string; chatId: string; username: string; preview: string; createdAt: number }[] | null>(null);
  useEffect(() => {
    void api<{ messages: NonNullable<typeof rows> }>("messages")
      .then((r) => setRows(r.messages))
      .catch(fail);
  }, []);
  if (!rows) return <Text style={{ color: colors.muted }}>{tr("Chargement…")}</Text>;
  if (!rows.length) return <Empty title={tr("Aucun message")} />;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>
        {tr("Les 50 derniers messages. Les conversations privées sont chiffrées de bout en bout : leur contenu n’est pas lisible, même par l’admin. Pour un message signalé, utilise « Signalements ».")}
      </Text>
      {rows.map((m) => (
        <View key={m.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
          <Text style={{ color: colors.fg }}>
            @{m.username} · <Text style={{ color: colors.muted }}>{m.preview || tr("Message")}</Text>
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {when(m.createdAt)} {tr("· conversation")} {m.chatId.slice(0, 10)}…
          </Text>
        </View>
      ))}
    </View>
  );
}

type Referrer = { id: string; username: string; displayName: string; badge: "blue" | "gold" | null; invited: number; active: number; month: number };

/** Biggest referrers: many invited but few in contact = probably fake accounts. */
function ReferrersTab() {
  const [rows, setRows] = useState<Referrer[] | null>(null);
  useEffect(() => {
    void wippApi<{ referrers: Referrer[] }>("rewards/top")
      .then((r) => setRows(r.referrers))
      .catch((err) => {
        setRows([]);
        fail(err);
      });
  }, []);
  if (!rows) return <ActivityIndicator color={colors.accent} />;
  if (!rows.length) return <Empty title={tr("Aucun parrain")} body={tr("Personne n’a encore été invité avec un code.")} />;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>{tr("Invités = ont entré le code · Actifs = en contact avec le parrain · 30 j = devenus actifs ce mois-ci (20 max).")}</Text>
      {rows.map((r) => {
        const suspect = r.invited >= 5 && r.active / Math.max(1, r.invited) < 0.3;
        return (
          <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, borderColor: suspect ? colors.danger : colors.hair, backgroundColor: colors.surface, padding: 12 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{r.displayName}</Text>
                <WippBadge badge={r.badge} size={14} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 12 }}>@{r.username}{suspect ? tr(" · ⚠️ à vérifier") : ""}</Text>
            </View>
            <Text style={{ color: colors.fg, fontSize: 12, textAlign: "right" }}>{r.invited} {tr("invités")}{"\n"}{r.active} {tr("actifs ·")} {r.month} {tr("/ 30 j")}</Text>
          </View>
        );
      })}
    </View>
  );
}

function UsersTab({ role }: { role: Role }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [picked, setPicked] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const load = useCallback(() => {
    void api<{ users: AdminUser[] }>(`users?q=${encodeURIComponent(q)}`)
      .then((r) => setUsers(r.users))
      .catch(fail);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);
  const act = (path: string, body: unknown, done: string) =>
    void api(path, body)
      .then(() => {
        setPicked(null);
        setReason("");
        Alert.alert(tr("Admin"), done);
        load();
      })
      .catch(fail);
  return (
    <View style={{ gap: 10 }}>
      <SearchField value={q} onChangeText={setQ} placeholder={tr("Nom ou @pseudo")} />
      {users.map((u) => (
        <Press key={u.id} onPress={() => setPicked(u)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
          <Avatar user={{ id: u.id, displayName: u.displayName, username: u.username, avatar: u.avatarUrl ?? "", firstName: u.displayName, lastName: "", bio: "", online: false, connected: false, city: "" }} size={42} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{u.displayName}</Text>
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
              @{u.username}
              {u.phone ? ` · ${u.phone}` : ""} {tr("· inscrit le")} {new Date(u.createdAt).toLocaleDateString(trLocale())}
            </Text>
          </View>
          <WippBadge badge={u.badge} size={14} />
          {u.suspendedAt ? <Badge text={tr("Suspendu")} tone="danger" /> : u.role !== "user" ? <Badge text={u.role === "admin" ? "Admin" : tr("Modérateur")} tone="accent" /> : null}
        </Press>
      ))}
      {!users.length ? <Text style={{ color: colors.muted }}>{tr("Aucun utilisateur.")}</Text> : null}
      <Sheet open={Boolean(picked)} title={picked ? `@${picked.username}` : ""} onClose={() => setPicked(null)}>
        {picked ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.muted }}>
              {picked.displayName} · {picked.role === "admin" ? tr("Administrateur") : picked.role === "moderator" ? tr("Modérateur") : tr("Utilisateur")}
              {picked.suspendedAt ? tr(" · suspendu le {0}{1}", when(picked.suspendedAt), picked.suspendedReason ? ` (${picked.suspendedReason})` : "") : ""}
            </Text>
            {role === "admin" ? (
              picked.badge === "gold" ? (
                <Btn
                  label={tr("Retirer la certification (badge doré)")}
                  variant="secondary"
                  onPress={() =>
                    void wippApi("rewards/certify", { method: "POST", body: JSON.stringify({ profileId: picked.id, on: false }) })
                      .then(() => { setPicked(null); Alert.alert(tr("Admin"), tr("Certification retirée.")); load(); })
                      .catch(fail)
                  }
                />
              ) : (
                <Btn
                  label={tr("✅ Certifier (badge doré)")}
                  onPress={() =>
                    void wippApi("rewards/certify", { method: "POST", body: JSON.stringify({ profileId: picked.id, on: true }) })
                      .then(() => { setPicked(null); Alert.alert(tr("Admin"), tr("@{0} est maintenant certifié(e).", picked.username)); load(); })
                      .catch(fail)
                  }
                />
              )
            ) : null}
            {role === "admin" && picked.role !== "admin" ? (
              picked.role === "moderator" ? (
                <Btn label={tr("Retirer le rôle de modérateur")} variant="secondary" onPress={() => act(`users/${picked.id}/role`, { role: "user" }, tr("Rôle de modérateur retiré."))} />
              ) : (
                <Btn label={tr("🛡️ Nommer modérateur")} onPress={() => act(`users/${picked.id}/role`, { role: "moderator" }, tr("@{0} est maintenant modérateur.", picked.username))} />
              )
            ) : null}
            {picked.role !== "admin" ? (
              picked.suspendedAt ? (
                <Btn label={tr("Rétablir le compte")} onPress={() => act(`users/${picked.id}/suspend`, { suspend: false }, tr("Compte rétabli."))} />
              ) : (
                <>
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder={tr("Motif de la suspension (facultatif)")}
                    placeholderTextColor={colors.muted}
                    maxLength={300}
                    style={{ minHeight: 44, borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 12, color: colors.fg }}
                  />
                  <Btn
                    label={tr("⛔ Suspendre le compte")}
                    variant="danger"
                    onPress={() =>
                      Alert.alert(tr("Suspendre"), tr("Suspendre @{0} ? Il ne pourra plus utiliser WIPP.", picked.username), [
                        { text: tr("Annuler"), style: "cancel" },
                        { text: tr("Suspendre"), style: "destructive", onPress: () => act(`users/${picked.id}/suspend`, { suspend: true, reason }, tr("Compte suspendu.")) },
                      ])
                    }
                  />
                </>
              )
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function Badge({ text, tone }: { text: string; tone: "accent" | "danger" }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: tone === "danger" ? colors.dangerSoft : accentA(0.15) }}>
      <Text style={{ color: tone === "danger" ? colors.danger : colors.accent, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>{text}</Text>
    </View>
  );
}

function ReportsTab() {
  const [status, setStatus] = useState<"open" | "all">("open");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [opened, setOpened] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    void api<{ reports: Report[] }>(`reports?status=${status}`)
      .then((r) => setReports(r.reports))
      .catch(fail);
  }, [status]);
  useEffect(load, [load]);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={tr("Ouverts")} active={status === "open"} onPress={() => setStatus("open")} />
        <Chip label={tr("Tous")} active={status === "all"} onPress={() => setStatus("all")} />
      </View>
      {reports === null ? <Text style={{ color: colors.muted }}>{tr("Chargement…")}</Text> : null}
      {reports?.length === 0 ? <Empty title={tr("Aucun signalement")} body={tr("Les signalements des utilisateurs apparaîtront ici.")} /> : null}
      {reports?.map((r) => (
        <Card key={r.id}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_700Bold" }}>🚩 {r.reason || tr("Signalement")}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {REPORT_TYPE[r.targetType] ?? r.targetType} {r.targetUsername ? tr("de @{0}", r.targetUsername) : ""} {tr("· signalé par")} {r.reporter ? `@${r.reporter}` : "?"} · {when(r.createdAt)} · {REPORT_STATUS[r.status] ?? r.status}
          </Text>
          {opened[r.id] ? (
            <View style={{ padding: 10, borderRadius: 10, backgroundColor: whiteA(0.05) }}>
              <Text style={{ color: colors.fg }}>{opened[r.id]}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {r.hasContent && !opened[r.id] ? (
              <Btn
                label={tr("Voir le message")}
                variant="secondary"
                onPress={() =>
                  void api<{ text: string }>(`reports/${r.id}/open`, {})
                    .then((c) => setOpened((o) => ({ ...o, [r.id]: c.text })))
                    .catch(fail)
                }
              />
            ) : null}
            {r.status === "open" ? (
              <>
                {r.removable ? (
                  <Btn
                    label={tr("Retirer le contenu")}
                    variant="danger"
                    onPress={() =>
                      Alert.alert(tr("Retirer le contenu"), tr("{0} ne sera plus visible pour personne.", REPORT_TYPE[r.targetType] ?? tr("Ce contenu")), [
                        { text: tr("Annuler"), style: "cancel" },
                        { text: tr("Retirer"), style: "destructive", onPress: () => void api(`reports/${r.id}/resolve`, { action: "removed" }).then(load).catch(fail) },
                      ])
                    }
                  />
                ) : null}
                <Btn label={tr("Traité")} onPress={() => void api(`reports/${r.id}/resolve`, { action: "resolved" }).then(load).catch(fail)} />
                <Btn label={tr("Classer")} variant="secondary" onPress={() => void api(`reports/${r.id}/resolve`, { action: "dismissed" }).then(load).catch(fail)} />
                {r.targetProfileId ? (
                  <Btn
                    label={tr("Suspendre le compte")}
                    variant="danger"
                    onPress={() =>
                      Alert.alert(tr("Suspendre le compte"), tr("{0} ne pourra plus utiliser WIPP. Tu peux le rétablir dans « Suspendus ».", r.targetUsername ? `@${r.targetUsername}` : tr("Ce compte")), [
                        { text: tr("Annuler"), style: "cancel" },
                        {
                          text: tr("Suspendre"),
                          style: "destructive",
                          onPress: () =>
                            void api(`users/${encodeURIComponent(String(r.targetProfileId).replace(/^srvuser:/, ""))}/suspend`, { suspend: true, reason: tr("Signalement : {0}", r.reason) })
                              .then(() => api(`reports/${r.id}/resolve`, { action: "resolved" }))
                              .then(load)
                              .catch(fail),
                        },
                      ])
                    }
                  />
                ) : null}
              </>
            ) : null}
          </View>
        </Card>
      ))}
    </View>
  );
}

function SuspendedTab() {
  const [users, setUsers] = useState<{ id: string; username: string; displayName: string; suspendedAt: number; reason: string | null; by: string | null }[] | null>(null);
  const load = useCallback(() => {
    void api<{ users: NonNullable<typeof users> }>("suspended")
      .then((r) => setUsers(r.users))
      .catch(fail);
  }, []);
  useEffect(load, [load]);
  if (!users) return <Text style={{ color: colors.muted }}>{tr("Chargement…")}</Text>;
  if (!users.length) return <Empty title={tr("Aucun compte suspendu")} />;
  return (
    <View style={{ gap: 10 }}>
      {users.map((u) => (
        <Card key={u.id}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>
            {u.displayName} · @{u.username}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {tr("Suspendu le")} {when(u.suspendedAt)}
            {u.by ? tr(" par @{0}", u.by) : ""}
            {u.reason ? ` · ${u.reason}` : ""}
          </Text>
          <Btn label={tr("Rétablir le compte")} variant="secondary" onPress={() => void api(`users/${u.id}/suspend`, { suspend: false }).then(load).catch(fail)} />
        </Card>
      ))}
    </View>
  );
}

function PushTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "user">("user");
  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<{ id: string; title: string; target: string; to_user: string | null; recipients: number; delivered: number; createdAt: number }[]>([]);
  const loadHistory = () =>
    void api<{ history: typeof history }>("push/history")
      .then((r) => setHistory(r.history))
      .catch(() => undefined);
  useEffect(() => {
    void api<{ templates: Template[] }>("push/templates")
      .then((r) => {
        setTemplates(r.templates);
        const first = r.templates[0];
        if (first) {
          setCurrent(first.id);
          setTitle(first.title);
          setBody(first.body);
        }
      })
      .catch(fail);
    loadHistory();
  }, []);
  const pick = (t: Template) => {
    setCurrent(t.id);
    setTitle(t.title);
    setBody(t.body);
  };
  const field = { borderRadius: 12, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 10, color: colors.fg, fontSize: 15 } as const;
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{tr("Modèles (modifiables)")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {templates.map((t) => (
          <Chip key={t.id} label={t.label} active={current === t.id} onPress={() => pick(t)} />
        ))}
        <Chip
          label={tr("+ Nouveau")}
          active={current === "new"}
          onPress={() => {
            setCurrent("new");
            setTitle("");
            setBody("");
          }}
        />
      </View>
      <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} placeholder={tr("Titre")} placeholderTextColor={colors.muted} style={field} />
      <TextInput value={body} onChangeText={(v) => setBody(v.slice(0, 240))} placeholder={tr("Message")} placeholderTextColor={colors.muted} multiline style={{ ...field, minHeight: 90, textAlignVertical: "top" }} />
      <Text style={{ alignSelf: "flex-end", color: colors.muted, fontSize: 12 }}>{body.length}/240</Text>
      {/* Preview of what the phone shows */}
      <View style={{ borderRadius: 16, backgroundColor: whiteA(0.08), padding: 12 }}>
        <Text style={{ color: colors.muted, fontSize: 11 }}>{tr("APERÇU · WIPP · maintenant")}</Text>
        <Text style={{ color: colors.fg, fontFamily: "Inter_700Bold", marginTop: 4 }}>{title || tr("Titre")}</Text>
        <Text style={{ color: colors.fg, marginTop: 2 }}>{body || tr("Message")}</Text>
      </View>
      <Btn
        label={tr("Enregistrer le modèle")}
        variant="secondary"
        disabled={!title.trim() || !body.trim()}
        onPress={() =>
          void api<Template>(`push/templates/${current && current !== "new" ? current : "new"}`, { label: templates.find((t) => t.id === current)?.label ?? title, title, body }, "PUT")
            .then((saved) => {
              setTemplates((list) => (list.some((t) => t.id === saved.id) ? list.map((t) => (t.id === saved.id ? saved : t)) : [...list, saved]));
              setCurrent(saved.id);
              Alert.alert(tr("Admin"), tr("Modèle enregistré."));
            })
            .catch(fail)
        }
      />
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>{tr("Destinataires")}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label={tr("Un utilisateur")} active={target === "user"} onPress={() => setTarget("user")} />
        <Chip label={tr("Tous les utilisateurs")} active={target === "all"} onPress={() => setTarget("all")} />
      </View>
      {target === "user" ? (
        <TextInput value={username} onChangeText={setUsername} placeholder="@pseudo" autoCapitalize="none" placeholderTextColor={colors.muted} style={field} />
      ) : null}
      <Btn
        label={sending ? tr("Envoi…") : tr("Envoyer la notification")}
        disabled={sending || !title.trim() || !body.trim() || (target === "user" && !username.trim())}
        onPress={() =>
          Alert.alert(tr("Envoyer"), target === "all" ? tr("Envoyer à TOUS les utilisateurs joignables ?") : tr("Envoyer à {0} ?", username.startsWith("@") ? username : `@${username}`), [
            { text: tr("Annuler"), style: "cancel" },
            {
              text: tr("Envoyer"),
              onPress: () => {
                setSending(true);
                void api<{ recipients: number; delivered: number }>("push/send", { title, body, target, username })
                  .then((r) => {
                    Alert.alert(tr("Admin"), tr("Envoyé : {0} appareil(s) pour {1} utilisateur(s).", r.delivered, r.recipients));
                    loadHistory();
                  })
                  .catch(fail)
                  .finally(() => setSending(false));
              },
            },
          ])
        }
      />
      {history.length ? <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>{tr("Historique")}</Text> : null}
      {history.map((h) => (
        <Card key={h.id}>
          <Text style={{ color: colors.fg, fontFamily: "Inter_600SemiBold" }}>{h.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {h.target === "all" ? tr("Tous") : `@${h.to_user ?? "?"}`} · {h.delivered}/{h.recipients} · {when(h.createdAt)}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const ACTIONS: Record<string, string> = {
  get moderator_added() { return tr("Modérateur nommé"); },
  get moderator_removed() { return tr("Modérateur retiré"); },
  get account_suspended() { return tr("Compte suspendu"); },
  get account_restored() { return tr("Compte rétabli"); },
  get report_resolved() { return tr("Signalement traité"); },
  get report_dismissed() { return tr("Signalement classé"); },
  get report_opened() { return tr("Message signalé consulté"); },
  get push_sent() { return tr("Notification envoyée"); },
  get push_template_saved() { return tr("Modèle de notification enregistré"); },
  get admin_phone_linked() { return tr("Numéro admin modifié"); },
};

function AuditTab() {
  const [rows, setRows] = useState<{ id: string; action: string; actor: string | null; target: string | null; createdAt: number }[] | null>(null);
  useEffect(() => {
    void api<{ audit: NonNullable<typeof rows> }>("audit")
      .then((r) => setRows(r.audit))
      .catch(fail);
  }, []);
  if (!rows) return <Text style={{ color: colors.muted }}>{tr("Chargement…")}</Text>;
  if (!rows.length) return <Empty title={tr("Aucune action")} />;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r) => (
        <View key={r.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.hair }}>
          <Text style={{ color: colors.fg }}>
            {ACTIONS[r.action] ?? r.action}
            {r.target ? ` · @${r.target}` : ""}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {tr("par @")}{r.actor ?? "?"} · {when(r.createdAt)}
          </Text>
        </View>
      ))}
    </View>
  );
}
