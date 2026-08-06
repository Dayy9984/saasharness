function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === '"' || char === "'") && line[index - 1] !== '\\') {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === '#' && quote === null) {
      return line.slice(0, index);
    }
  }
  return line;
}

function splitInlineList(source) {
  const values = [];
  let quote = null;
  let current = '';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if ((char === '"' || char === "'") && source[index - 1] !== '\\') {
      quote = quote === char ? null : quote ?? char;
      current += char;
      continue;
    }
    if (char === ',' && quote === null) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '') return {};
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineList(inner).map(parseScalar);
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseYamlLite(source, fileName = 'YAML') {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = source.split(/\r?\n/);

  lines.forEach((rawLine, lineIndex) => {
    const uncommented = stripComment(rawLine).replace(/\s+$/, '');
    if (!uncommented.trim()) return;
    if (uncommented.includes('\t')) {
      throw new Error(`${fileName}:${lineIndex + 1}: tabs are not supported`);
    }

    const indent = uncommented.length - uncommented.trimStart().length;
    if (indent % 2 !== 0) {
      throw new Error(`${fileName}:${lineIndex + 1}: indentation must use multiples of two spaces`);
    }

    const line = uncommented.trim();
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).value;

    if (line.startsWith('- ')) {
      if (!Array.isArray(parent)) {
        throw new Error(`${fileName}:${lineIndex + 1}: block lists are only supported below an empty key`);
      }
      parent.push(parseScalar(line.slice(2)));
      return;
    }

    const colon = line.indexOf(':');
    if (colon <= 0) {
      throw new Error(`${fileName}:${lineIndex + 1}: expected key: value`);
    }
    const key = line.slice(0, colon).trim();
    const rawValue = line.slice(colon + 1).trim();
    if (Object.prototype.hasOwnProperty.call(parent, key)) {
      throw new Error(`${fileName}:${lineIndex + 1}: duplicate key ${key}`);
    }

    if (rawValue === '') {
      const nextNonEmpty = lines.slice(lineIndex + 1).find((candidate) => stripComment(candidate).trim());
      const nextTrimmed = nextNonEmpty ? stripComment(nextNonEmpty).trim() : '';
      const container = nextTrimmed.startsWith('- ') ? [] : {};
      parent[key] = container;
      stack.push({ indent, value: container });
      return;
    }

    parent[key] = parseScalar(rawValue);
  });

  return root;
}
