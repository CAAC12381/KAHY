import { BadgeCheck, BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import { trustedSources } from "../../mock/data";
import type { ScreeningDefinition } from "../../mock/screenings";

/** "Fuentes y validación": referencias APA del instrumento y su validación en México. */
export default function SourcesPanel({ definition, open = false }: { definition: ScreeningDefinition; open?: boolean }) {
  const sources = definition.sourceIds.map((id) => trustedSources.find((item) => item.id === id)).filter((source) => source !== undefined);

  return (
    <details className="assistant-details screening-sources" open={open}>
      <summary><span><BookOpen size={16} /> Fuentes y validación</span><ChevronDown size={16} /></summary>
      <div className="assistant-details-body">
        <p className="screening-validation-note"><BadgeCheck size={16} aria-hidden="true" /> {definition.mexicoValidation}</p>
        <ol className="screening-references">
          {definition.references.map((reference) => (
            <li key={reference.apa}>
              {reference.apa}{" "}
              {reference.url && <a href={reference.url} target="_blank" rel="noreferrer">{reference.url.replace(/^https?:\/\//, "")} <ExternalLink size={12} aria-hidden="true" /></a>}
            </li>
          ))}
        </ol>
        {sources.map((source) => (
          <a className="screening-source-row" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
            <strong>{source.title}</strong>
            <small>{source.organization}</small>
            <span>{source.summary}</span>
          </a>
        ))}
      </div>
    </details>
  );
}
