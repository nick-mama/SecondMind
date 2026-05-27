export interface ExtractedMetadata {
  wordCount: number;
  estimatedReadTime: number;
  dates: string[];
  emails: string[];
  urls: string[];
  keywords: string[];
}

// Simple regex-based extraction for now.
export function extractMetadata(content: string): ExtractedMetadata {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const estimatedReadTime = Math.ceil(wordCount / 200); // avg 200 words/min

  // Extract dates (common formats)
  const dateRegex =
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},?\s+\d{4})\b/g;
  const dates = [...new Set(content.match(dateRegex) || [])];

  // Extract email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = [...new Set(content.match(emailRegex) || [])];

  // Extract URLs
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = [...new Set(content.match(urlRegex) || [])];

  // Extract keywords, words longer than 6 chars that appear more than once
  const words = content.toLowerCase().match(/\b[a-z]{6,}\b/g) || [];
  const wordFreq = words.reduce(
    (acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const keywords = Object.entries(wordFreq)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  return { wordCount, estimatedReadTime, dates, emails, urls, keywords };
}
