"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="mb-2 mt-6 font-fraunces text-lg font-semibold text-navy-deep first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1.5 mt-4 font-mono text-xs font-semibold uppercase tracking-widest text-steel">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 leading-relaxed text-ink">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1 pl-5 text-ink">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-ink">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-navy-deep">{children}</strong>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <code className="block w-full overflow-x-auto whitespace-pre font-mono text-sm leading-relaxed text-ink">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded-[2px] bg-line px-1 py-0.5 font-mono text-[13px] text-navy-deep">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-4 overflow-x-auto rounded-[3px] border border-line bg-paper p-4">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-paper">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-line px-3 py-2 text-left font-mono text-xs font-semibold uppercase tracking-wider text-steel">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-line px-3 py-2 text-ink">{children}</td>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-brass pl-4 text-muted">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-5 border-line" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
