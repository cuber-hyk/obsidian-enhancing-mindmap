interface OrderedNodeText {
  number: number;
  delimiter: string;
  content: string;
}

export interface OrderedSiblingNumbering {
  startIndex: number;
  texts: string[];
  selectionOffset: number;
}

function parseOrderedNodeText(text: string): OrderedNodeText | null {
  const match = /^(\d+)([.)])\s+/.exec(text);
  if (!match) return null;
  return {
    number: Number(match[1]),
    delimiter: match[2],
    content: text.slice(match[0].length),
  };
}

export function escapeLeadingOrderedNodeMarker(text: string): string {
  return text.replace(/^(\d+)([.)])(?=\s)/, '$1\\$2');
}

export function restoreLeadingOrderedNodeMarker(text: string): string {
  return text.replace(/^(\d+)\\([.)])(?=\s)/, '$1$2');
}

export function getOrderedSiblingNumbering(
  siblingTexts: string[],
  referenceIndex: number,
  insertionIndex: number,
  newNodeText: string,
): OrderedSiblingNumbering | null {
  const reference = parseOrderedNodeText(siblingTexts[referenceIndex]);
  if (!reference) return null;

  var startIndex = referenceIndex;
  var endIndex = referenceIndex;
  while (startIndex > 0) {
    const previous = parseOrderedNodeText(siblingTexts[startIndex - 1]);
    if (!previous || previous.delimiter !== reference.delimiter) break;
    startIndex--;
  }
  while (endIndex < siblingTexts.length - 1) {
    const next = parseOrderedNodeText(siblingTexts[endIndex + 1]);
    if (!next || next.delimiter !== reference.delimiter) break;
    endIndex++;
  }

  const group = siblingTexts.slice(startIndex, endIndex + 1);
  group.splice(insertionIndex - startIndex, 0, newNodeText);
  const startNumber = parseOrderedNodeText(siblingTexts[startIndex]).number;
  const insertedOffset = insertionIndex - startIndex;
  const texts = group.map((text, offset) => {
    const content = offset === insertedOffset
      ? text
      : parseOrderedNodeText(text).content;
    return `${startNumber + offset}${reference.delimiter} ${content}`;
  });

  return {
    startIndex,
    texts,
    selectionOffset: `${startNumber + insertedOffset}${reference.delimiter} `.length,
  };
}
