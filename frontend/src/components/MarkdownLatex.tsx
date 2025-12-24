import ReactMarkdown from 'react-markdown';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownLatexProps {
  children: string;
  className?: string;
}

function renderLatex(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Handle display math $$...$$
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  let lastIndex = 0;
  let match;

  while ((match = displayRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    try {
      const html = katex.renderToString(match[1], { throwOnError: false, displayMode: true });
      parts.push(<span key={key++} className="block my-2" dangerouslySetInnerHTML={{ __html: html }} />);
    } catch {
      parts.push(<span key={key++}>{match[0]}</span>);
    }
    lastIndex = match.index + match[0].length;
  }

  remaining = lastIndex < text.length ? text.slice(lastIndex) : '';

  // Handle inline math $...$
  if (remaining) {
    const inlineRegex = /\$([^$]+)\$/g;
    lastIndex = 0;

    while ((match = inlineRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
      }
      try {
        const html = katex.renderToString(match[1], { throwOnError: false, displayMode: false });
        parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: html }} />);
      } catch {
        parts.push(<span key={key++}>{match[0]}</span>);
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
    }
  }

  return parts.length > 0 ? parts : [<span key={0}>{text}</span>];
}

export function MarkdownLatex({ children, className }: MarkdownLatexProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Render LaTeX in text nodes
          p: ({ children }) => <p className="mb-2">{typeof children === 'string' ? renderLatex(children) : children}</p>,
          li: ({ children }) => <li>{typeof children === 'string' ? renderLatex(children) : children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto my-2">{children}</pre>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
          a: ({ href, children }) => <a href={href} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">{children}</blockquote>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
