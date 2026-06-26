
interface EvidenceSnippetProps {
  code: string;
  highlightLine?: number;
}

export function EvidenceSnippet({ code, highlightLine }: EvidenceSnippetProps) {
  return (
    <div className="bg-void border border-border rounded-lg overflow-hidden font-mono text-sm shadow-inner relative">
      {highlightLine && highlightLine > 0 && (
        <div className="absolute top-0 left-0 w-1 h-full bg-conf-critical/50 z-10" />
      )}
      <div className="p-3 overflow-x-auto">
        <pre className="text-text-primary whitespace-pre-wrap break-all">
          <code className={`${highlightLine && highlightLine > 0 ? 'bg-conf-critical/10 text-conf-critical decoration-conf-critical/30 line-through' : ''} px-1 rounded`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
