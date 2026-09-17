export function toSentenceCase(value: string): string {
  return value.replace(/\b\w+/g, (word) => {
    const lower = word.toLowerCase();
    const exceptions = ["and", "of", "the", "for", "e2e", "usb", "cvm", "wifi"];
    if (exceptions.includes(lower)) return lower;
    if (/^[A-Z0-9]{2,}$/.test(word)) {
      // Preserve known acronyms but gently sentence-case obvious service headers.
      const knownAcronyms = ["NIN", "BVN", "CAC", "NYSC", "JAMB", "UTME", "CBT", "POS", "B2B", "B2C", "QR", "PDF", "APP", "DBE", "DRS", "A2S", "A3B"];
      if (knownAcronyms.includes(word.toUpperCase())) return word.toUpperCase();
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}