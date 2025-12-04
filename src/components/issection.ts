export const isSection = (title: string) => {
  if (!title) return false;

  // Match pattern: ✦ x區 ✦ where x is any string
  // The pattern should start with ✦, followed by any characters, then 區, then space and ✦
  const sectionPattern = /^✦\s*.+?\s*區\s*✦/;

  return sectionPattern.test(title.trim());
};
