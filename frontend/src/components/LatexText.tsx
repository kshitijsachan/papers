import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexTextProps {
  children: string;
  className?: string;
}

export function LatexText({ children, className }: LatexTextProps) {
  const rendered = useMemo(() => {
    // Split text by LaTeX delimiters and render each part
    // Matches $...$ for inline math and $$...$$ for display math
    const parts: { type: 'text' | 'math' | 'display'; content: string }[] = [];

    // First handle display math $$...$$
    let remaining = children;
    const displayRegex = /\$\$([\s\S]*?)\$\$/g;
    let lastIndex = 0;
    let match;

    while ((match = displayRegex.exec(children)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: children.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'display', content: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < children.length) {
      remaining = children.slice(lastIndex);
    } else {
      remaining = '';
    }

    // Then handle inline math $...$ in remaining text
    if (remaining) {
      const inlineRegex = /\$([^$]+)\$/g;
      lastIndex = 0;

      while ((match = inlineRegex.exec(remaining)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', content: remaining.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'math', content: match[1] });
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < remaining.length) {
        parts.push({ type: 'text', content: remaining.slice(lastIndex) });
      }
    }

    // If no math found, just return the original text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: children });
    }

    // Render each part
    return parts.map((part, idx) => {
      if (part.type === 'text') {
        return <span key={idx}>{part.content}</span>;
      }

      try {
        const html = katex.renderToString(part.content, {
          throwOnError: false,
          displayMode: part.type === 'display',
        });
        return (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: html }}
            className={part.type === 'display' ? 'block my-2' : 'inline'}
          />
        );
      } catch {
        // If KaTeX fails, just show the original text
        return <span key={idx}>{part.type === 'display' ? `$$${part.content}$$` : `$${part.content}$`}</span>;
      }
    });
  }, [children]);

  return <span className={className}>{rendered}</span>;
}
