/** Labels emitted by civilian mobile app `buildDescriptionPayload` (TYPE_SPECIFIC_FIELDS + context). */
export const CIVILIAN_INTAKE_FIELD_LABELS = [
  "Building type",
  "Smoke visible?",
  "People trapped?",
  "Conscious?",
  "Breathing?",
  "Number of patients",
  "Ongoing?",
  "Suspect nearby?",
  "Vehicles involved",
  "Injuries reported?",
  "Water level",
  "Area affected",
  "Hazard type",
  "Live wire status",
  "Who is trapped?",
  "Immediate danger",
  "Situation summary",
  "Landmark",
  "People involved",
] as const;

export type NarrativeField = { label: string; value: string };

export type ParsedInitialNarrative = {
  narrative: string | null;
  fields: NarrativeField[];
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isKnownFieldLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return CIVILIAN_INTAKE_FIELD_LABELS.some(
    (known) => known.toLowerCase() === normalized,
  );
}

function extractFieldsFromCollapsedText(text: string): ParsedInitialNarrative {
  const labels = [...CIVILIAN_INTAKE_FIELD_LABELS].sort((a, b) => b.length - a.length);
  const labelPattern = labels.map(escapeRegex).join("|");
  const regex = new RegExp(`(${labelPattern}):\\s*`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) {
    const trimmed = text.trim();
    return { narrative: trimmed || null, fields: [] };
  }

  const narrative = parts[0]?.trim() || null;
  const fields: NarrativeField[] = [];

  for (let index = 1; index < parts.length; index += 2) {
    const label = parts[index]?.trim();
    const value = parts[index + 1]?.trim();
    if (label && value) {
      fields.push({ label, value });
    }
  }

  return { narrative, fields };
}

function parseMultilineDescription(description: string): ParsedInitialNarrative {
  const paragraphs = description
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const narrativeParts: string[] = [];
  const fields: NarrativeField[] = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const fieldLinePattern = /^(.+?):\s*(.+)$/;
    const allLinesAreFields = lines.every((line) => {
      const match = line.match(fieldLinePattern);
      return match && isKnownFieldLabel(match[1]);
    });

    if (allLinesAreFields) {
      for (const line of lines) {
        const match = line.match(fieldLinePattern);
        if (match) {
          fields.push({ label: match[1].trim(), value: match[2].trim() });
        }
      }
      continue;
    }

    if (lines.length === 1) {
      const collapsed = extractFieldsFromCollapsedText(lines[0]);
      if (collapsed.fields.length > 0) {
        if (collapsed.narrative) {
          narrativeParts.push(collapsed.narrative);
        }
        fields.push(...collapsed.fields);
      } else {
        narrativeParts.push(lines[0]);
      }
      continue;
    }

    for (const line of lines) {
      const match = line.match(fieldLinePattern);
      if (match && isKnownFieldLabel(match[1])) {
        fields.push({ label: match[1].trim(), value: match[2].trim() });
      } else {
        narrativeParts.push(line);
      }
    }
  }

  return {
    narrative: narrativeParts.length > 0 ? narrativeParts.join("\n\n") : null,
    fields,
  };
}

function appendMissingContextFields(
  fields: NarrativeField[],
  landmark?: string | null,
  peopleInvolved?: number | string | null,
): NarrativeField[] {
  const next = [...fields];

  if (landmark?.trim()) {
    const hasLandmark = next.some(
      (field) => field.label.toLowerCase() === "landmark",
    );
    if (!hasLandmark) {
      next.push({ label: "Landmark", value: landmark.trim() });
    }
  }

  if (peopleInvolved != null && peopleInvolved !== "") {
    const hasPeople = next.some(
      (field) => field.label.toLowerCase() === "people involved",
    );
    if (!hasPeople) {
      next.push({ label: "People involved", value: String(peopleInvolved) });
    }
  }

  return next;
}

export function parseInitialNarrative(
  description: string | null | undefined,
  options?: {
    landmark?: string | null;
    peopleInvolved?: number | string | null;
  },
): ParsedInitialNarrative {
  if (!description?.trim()) {
    const fields = appendMissingContextFields(
      [],
      options?.landmark,
      options?.peopleInvolved,
    );
    return { narrative: null, fields };
  }

  const trimmed = description.trim();
  const parsed = trimmed.includes("\n")
    ? parseMultilineDescription(trimmed)
    : extractFieldsFromCollapsedText(trimmed);

  return {
    narrative: parsed.narrative,
    fields: appendMissingContextFields(
      parsed.fields,
      options?.landmark,
      options?.peopleInvolved,
    ),
  };
}
