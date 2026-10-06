import { Text, View } from "react-native";
import { Check, Globe, Lock } from "lucide-react-native";
import { Press } from "./ui";
import { colors } from "../theme";
import type { GroupSettings } from "../lib/types";

export const GROUP_DISAPPEAR: { label: string; ms: number }[] = [
  { label: "Désactivés", ms: 0 },
  { label: "24 heures", ms: 86_400_000 },
  { label: "7 jours", ms: 7 * 86_400_000 },
  { label: "30 jours", ms: 30 * 86_400_000 },
];

function Tick({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: on ? colors.accent : colors.muted,
        backgroundColor: on ? colors.accent : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on ? <Check size={15} color={colors.accentFg} strokeWidth={3} /> : null}
    </View>
  );
}

function CheckRow({ label, sub, on, onToggle, disabled }: { label: string; sub?: string; on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <Press
      disabled={disabled}
      onPress={onToggle}
      accessibilityLabel={`${label} : ${on ? "activé" : "désactivé"}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, opacity: disabled ? 0.45 : 1 }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.fg, fontSize: 15 }}>{label}</Text>
        {sub ? <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 16 }}>{sub}</Text> : null}
      </View>
      <Tick on={on} />
    </Press>
  );
}

/** Privé / Public — the two cards of the mock-up. */
export function GroupVisibilityPicker({ value, onChange }: { value: GroupSettings["visibility"]; onChange: (v: GroupSettings["visibility"]) => void }) {
  const card = (id: GroupSettings["visibility"], Icon: typeof Lock, title: string, sub: string) => {
    const on = value === id;
    return (
      <Press
        key={id}
        onPress={() => onChange(id)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 16,
          backgroundColor: on ? colors.accentSoft : colors.surface2,
          borderWidth: 1.5,
          borderColor: on ? colors.accent : colors.hair,
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: on ? colors.accent : colors.surface, alignItems: "center", justifyContent: "center" }}>
          <Icon size={19} color={on ? colors.accentFg : colors.fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>{title}</Text>
          <Text style={{ marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 16 }}>{sub}</Text>
        </View>
      </Press>
    );
  };
  return (
    <View style={{ gap: 10 }}>
      {card("private", Lock, "Privé", "Seules les personnes ajoutées par le groupe peuvent rejoindre. Pas de lien d’invitation.")}
      {card("public", Globe, "Public", "Toute personne qui a le lien d’invitation peut rejoindre.")}
    </View>
  );
}

/**
 * Autorisations du groupe : coches for what members may do + disappearing messages.
 * Admins can always do everything; these rules apply to the other members.
 */
export function GroupPermissionsEditor({
  value,
  onChange,
  disappearMs,
  onDisappear,
}: {
  value: GroupSettings;
  onChange: (next: GroupSettings) => void;
  disappearMs: number;
  onDisappear: (ms: number) => void;
}) {
  const set = (patch: Partial<GroupSettings>) => onChange({ ...value, ...patch });
  return (
    <View>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Les admins peuvent toujours tout faire. Ces règles s’appliquent aux autres membres.</Text>
      <CheckRow label="Modifier les infos du groupe" sub="Nom, photo et description." on={value.membersCanEdit} onToggle={() => set({ membersCanEdit: !value.membersCanEdit })} />
      <CheckRow
        label="Envoyer des messages"
        sub={value.membersCanSend ? "Tout le monde peut écrire." : "Seuls les admins écrivent (groupe d’annonces)."}
        on={value.membersCanSend}
        onToggle={() => set({ membersCanSend: !value.membersCanSend })}
      />
      <CheckRow label="Ajouter de nouveaux membres" sub="Parmi leurs contacts WIPP." on={value.membersCanAdd} onToggle={() => set({ membersCanAdd: !value.membersCanAdd })} />
      <CheckRow
        label="Inviter par lien"
        sub={value.visibility === "public" ? "Créer et partager le lien d’invitation." : "Disponible seulement pour un groupe Public."}
        on={value.visibility === "public" && value.membersCanInvite}
        disabled={value.visibility !== "public"}
        onToggle={() => set({ membersCanInvite: !value.membersCanInvite })}
      />
      <CheckRow
        label="Approuver les nouveaux membres"
        sub={value.approveNewMembers ? "Un admin valide chaque arrivée (par lien ou ajoutée par un membre)." : "Les nouveaux membres rejoignent directement."}
        on={value.approveNewMembers}
        onToggle={() => set({ approveNewMembers: !value.approveNewMembers })}
      />
      <Text style={{ marginTop: 16, marginBottom: 8, color: colors.fg, fontSize: 15, fontFamily: "Inter_600SemiBold" }}>Messages éphémères</Text>
      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>Les nouveaux messages disparaissent après la durée choisie.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {GROUP_DISAPPEAR.map((o) => {
          const on = disappearMs === o.ms;
          return (
            <Press
              key={o.ms}
              onPress={() => onDisappear(o.ms)}
              style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? colors.accent : colors.surface2, borderWidth: 1, borderColor: on ? colors.accent : colors.hair }}
            >
              <Text style={{ color: on ? colors.accentFg : colors.fg, fontSize: 13, fontFamily: on ? "Inter_600SemiBold" : undefined }}>{o.label}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}
