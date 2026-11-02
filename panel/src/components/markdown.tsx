import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders archive markdown (prep packs, outcome notes, archived postings).
 * react-markdown ignores raw HTML by default, which matters here: a posting is
 * third-party text. Links are restricted to http(s) and open in a new tab.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-panel text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) => (/^https?:\/\//i.test(url) ? url : "")}
        components={{
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
