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

export interface OrderedSiblingEntry<T> {
  item: T;
  text: string;
}

export interface OrderedSiblingGroupSnapshot<T> {
  items: T[];
  startNumber: number;
  delimiter: string;
}

export interface OrderedSiblingTextUpdate<T> {
  item: T;
  text: string;
}

interface OrderedSiblingNormalizationOptions<T> {
  preferredGroup?: OrderedSiblingGroupSnapshot<T>;
  adoptItems?: T[];
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

export function captureOrderedSiblingGroups<T>(
  entries: OrderedSiblingEntry<T>[],
): OrderedSiblingGroupSnapshot<T>[] {
  const groups: OrderedSiblingGroupSnapshot<T>[] = [];
  let index = 0;

  while (index < entries.length) {
    const parsed = parseOrderedNodeText(entries[index].text);
    if (!parsed) {
      index++;
      continue;
    }

    const items = [entries[index].item];
    var endIndex = index + 1;
    while (endIndex < entries.length) {
      const next = parseOrderedNodeText(entries[endIndex].text);
      if (!next || next.delimiter !== parsed.delimiter) break;
      items.push(entries[endIndex].item);
      endIndex++;
    }

    groups.push({
      items,
      startNumber: parsed.number,
      delimiter: parsed.delimiter,
    });
    index = endIndex;
  }

  return groups;
}

export function getOrderedSiblingTextUpdates<T>(
  entries: OrderedSiblingEntry<T>[],
  originalGroups: OrderedSiblingGroupSnapshot<T>[],
  options: OrderedSiblingNormalizationOptions<T> = {},
): OrderedSiblingTextUpdate<T>[] {
  const adoptItems = new Set(options.adoptItems || []);
  const currentItems = entries.map(({item}) => item);
  const parsedEntries = entries.map((entry) => {
    let parsed = parseOrderedNodeText(entry.text);
    if (options.preferredGroup && adoptItems.has(entry.item)) {
      parsed = parsed
        ? {...parsed, delimiter: options.preferredGroup.delimiter}
        : {
          number: options.preferredGroup.startNumber,
          delimiter: options.preferredGroup.delimiter,
          content: entry.text,
        };
    }
    return {entry, parsed};
  });
  const updates: OrderedSiblingTextUpdate<T>[] = [];
  let index = 0;

  while (index < parsedEntries.length) {
    const current = parsedEntries[index];
    if (!current.parsed) {
      index++;
      continue;
    }

    const group = [current];
    var endIndex = index + 1;
    while (
      endIndex < parsedEntries.length &&
      parsedEntries[endIndex].parsed?.delimiter === current.parsed.delimiter
    ) {
      group.push(parsedEntries[endIndex]);
      endIndex++;
    }

    const items = group.map(({entry}) => entry.item);
    const matchingGroups = originalGroups.filter((snapshot) =>
      snapshot.items.some((item) => items.includes(item))
    );
    const preferredGroup = options.preferredGroup && (
      options.preferredGroup.items.some((item) => items.includes(item)) ||
      items.some((item) => adoptItems.has(item))
    ) ? options.preferredGroup : undefined;
    const sourceGroup = preferredGroup || matchingGroups[0];
    if (!sourceGroup || isUnchangedGroup(items, matchingGroups, adoptItems)) {
      index = endIndex;
      continue;
    }

    const startNumber = getCurrentGroupStartNumber(items, currentItems, sourceGroup);
    group.forEach(({entry, parsed}, offset) => {
      const text = `${startNumber + offset}${sourceGroup.delimiter} ${parsed.content}`;
      if (text !== entry.text) updates.push({item: entry.item, text});
    });
    index = endIndex;
  }

  return updates;
}

function getCurrentGroupStartNumber<T>(
  items: T[],
  currentItems: T[],
  sourceGroup: OrderedSiblingGroupSnapshot<T>,
): number {
  if (sourceGroup.items.every((item) => items.includes(item))) {
    return sourceGroup.startNumber;
  }

  const currentIndex = items.findIndex((item) => sourceGroup.items.includes(item));
  if (currentIndex < 0) return sourceGroup.startNumber;
  const sourceIndex = sourceGroup.items.indexOf(items[currentIndex]);
  const earlierSourceItemStillExists = sourceGroup.items
    .slice(0, sourceIndex)
    .some((item) => currentItems.includes(item));
  return earlierSourceItemStillExists
    ? sourceGroup.startNumber + sourceIndex - currentIndex
    : sourceGroup.startNumber;
}

export function findOrderedSiblingGroup<T>(
  groups: OrderedSiblingGroupSnapshot<T>[],
  item: T | undefined,
): OrderedSiblingGroupSnapshot<T> | undefined {
  return item === undefined
    ? undefined
    : groups.find((group) => group.items.includes(item));
}

function isUnchangedGroup<T>(
  items: T[],
  matchingGroups: OrderedSiblingGroupSnapshot<T>[],
  adoptItems: Set<T>,
): boolean {
  return matchingGroups.length === 1 &&
    matchingGroups[0].items.length === items.length &&
    matchingGroups[0].items.every((item, index) => item === items[index]) &&
    !items.some((item) => adoptItems.has(item));
}
