import { SiteShell } from "@/components/site-shell";
import { LEGAL_CONTACT, LEGAL_VERSION, legalDoc, type LegalDocId } from "@/lib/legal";

/** Same text as in the app (src/lib/legal.ts, copied from native/src/lib/legal.ts): one source for both. */
export function LegalPage({ id, pill }: { id: LegalDocId; pill: string }) {
  const doc = legalDoc("fr", id);
  return (
    <SiteShell pill={pill}>
      <article className="site-prose">
        <p className="connect-kicker">Légal</p>
        <h1>{doc.title}</h1>
        <p className="site-meta">
          Dernière mise à jour : {doc.updated} · version {LEGAL_VERSION}
        </p>
        {doc.intro ? <p>{doc.intro}</p> : null}
        {doc.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>
        ))}
        <h2>Contact</h2>
        <p>
          <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a> · <a href="/support">Support</a> ·{" "}
          <a href="/delete-account">Supprimer mon compte</a>
        </p>
      </article>
    </SiteShell>
  );
}
