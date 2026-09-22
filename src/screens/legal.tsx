import { FileText } from "lucide-react";
import { Header, StatusBar } from "@/components/ui";
import { LEGAL_CONTACT, LEGAL_VERSION, legalDoc, type LegalDocId } from "@/lib/legal";
import { useT, useWgoStore } from "@/lib/store";

export function LegalScreen({ doc }: { doc: LegalDocId }) {
  const t = useT();
  const pop = useWgoStore((s) => s.pop);
  const lang = useWgoStore((s) => s.language);
  const paper = legalDoc(lang, doc);

  return (
    <div className="flex h-full flex-col bg-bg">
      <StatusBar />
      <Header title={paper.title} onBack={pop} />
      <LegalBody doc={doc} />
    </div>
  );
}

export function LegalOverlay({
  doc,
  onClose,
}: {
  doc: LegalDocId;
  onClose: () => void;
}) {
  const lang = useWgoStore((s) => s.language);
  const t = useT();
  const paper = legalDoc(lang, doc);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-bg">
      <StatusBar />
      <Header title={paper.title} onBack={onClose} />
      <LegalBody doc={doc} footer={t("legalCloseHint")} />
    </div>
  );
}

function LegalBody({ doc, footer }: { doc: LegalDocId; footer?: string }) {
  const lang = useWgoStore((s) => s.language);
  const t = useT();
  const paper = legalDoc(lang, doc);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-10">
      <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
        <FileText className="size-3.5" />
        <span>
          {t("legalUpdated")} {paper.updated} · v{LEGAL_VERSION}
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">{paper.intro}</p>
      {paper.sections.map((section) => (
        <section key={section.title} className="mt-5">
          <h2 className="text-[15px] font-semibold tracking-tight">{section.title}</h2>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 48)} className="mt-2 text-[14px] leading-relaxed text-fg/90">
              {p}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-8 text-[13px] text-muted">
        {t("legalContact")} {LEGAL_CONTACT}
      </p>
      {footer ? <p className="mt-2 text-[12px] text-muted">{footer}</p> : null}
    </div>
  );
}
