import { useState } from "react";

// Minimal, dependency-free markdown renderer. Builds React elements directly
// (never dangerouslySetInnerHTML), so there's no HTML-injection surface even
// though the text comes from an LLM.

function renderInline(text, keyPrefix) {
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*)/g;
  const nodes = [];
  let lastIndex = 0;
  let m;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-${i++}`}>{m[2]}</strong>);
    else if (m[3] !== undefined) nodes.push(<code key={`${keyPrefix}-${i++}`}>{m[3]}</code>);
    else if (m[4] !== undefined) nodes.push(
      <a key={`${keyPrefix}-${i++}`} href={m[5]} target="_blank" rel="noreferrer">{m[4]}</a>
    );
    else if (m[6] !== undefined) nodes.push(<em key={`${keyPrefix}-${i++}`}>{m[6]}</em>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }
  return (
    <div className="md-code-block">
      <div className="md-code-head">
        <span>{lang || "code"}</span>
        <button onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function TextBlock({ text, keyPrefix }) {
  const lines = text.split("\n");
  const elements = [];
  let listBuffer = [];
  let listType = null;

  function flushList() {
    if (!listBuffer.length) return;
    const Tag = listType === "ol" ? "ol" : "ul";
    elements.push(
      <Tag key={`${keyPrefix}-list-${elements.length}`}>
        {listBuffer.map((item, i) => <li key={i}>{renderInline(item, `${keyPrefix}-li-${i}`)}</li>)}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); return; }

    const bullet = /^[-*]\s+(.*)/.exec(trimmed);
    const numbered = /^\d+\.\s+(.*)/.exec(trimmed);
    if (bullet) {
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(numbered[1]);
      return;
    }
    flushList();

    const heading = /^(#{1,3})\s+(.*)/.exec(trimmed);
    if (heading) {
      const Tag = `h${Math.min(heading[1].length + 3, 6)}`;
      elements.push(
        <Tag key={`${keyPrefix}-h-${i}`} style={{ margin: "10px 0 4px" }}>
          {renderInline(heading[2], `${keyPrefix}-h-${i}`)}
        </Tag>
      );
      return;
    }

    elements.push(
      <p key={`${keyPrefix}-p-${i}`} style={{ margin: "0 0 8px" }}>
        {renderInline(trimmed, `${keyPrefix}-p-${i}`)}
      </p>
    );
  });
  flushList();
  return <>{elements}</>;
}

export default function Markdown({ text }) {
  if (!text) return null;
  const parts = text.split(/```/);
  return (
    <div className="md">
      {parts.map((part, idx) => {
        if (idx % 2 === 1) {
          const lines = part.split("\n");
          let lang = "";
          let code = part;
          if (lines[0] && !lines[0].includes(" ") && lines.length > 1) {
            lang = lines[0].trim();
            code = lines.slice(1).join("\n");
          }
          return <CodeBlock key={idx} code={code.replace(/\n$/, "")} lang={lang} />;
        }
        return <TextBlock key={idx} text={part} keyPrefix={`b${idx}`} />;
      })}
    </div>
  );
}
