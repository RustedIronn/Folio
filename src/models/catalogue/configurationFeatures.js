// Use the selected configuration's door description, never unrelated technical fields.
export function supportsDoorAccessories(record) {
  const text=[record?.quantityType,record?.technical?.carProtectionDoor,record?.technical?.landingProtection].filter(Boolean).join(" ").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g," ");
  return /\bswing\s*door\b|\bcollaps(?:ible|able)\b/.test(text);
}
