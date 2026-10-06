// Parse CSV string into array of objects
export const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const obj = {};
    const values = parseCSVLine(line);

    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });

    rows.push(obj);
  }

  return rows;
};

// Parse a single CSV line (handles quoted values with commas)
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

// Validate article data
export const validateArticle = (article) => {
  const errors = [];

  if (!article.title || article.title.trim() === '') {
    errors.push('Title is required');
  }

  if (!article.slug || article.slug.trim() === '') {
    errors.push('Slug is required');
  }

  if (!article.excerpt || article.excerpt.trim() === '') {
    errors.push('Excerpt is required');
  }

  if (!article.content || article.content.trim() === '') {
    errors.push('Content is required');
  }

  const status = article.status || 'draft';
  if (!['draft', 'published'].includes(status)) {
    errors.push('Status must be "draft" or "published"');
  }

  return errors;
};

// Convert CSV row to article format
export const csvRowToArticle = (row) => {
  return {
    title: row.title || '',
    slug: row.slug || '',
    excerpt: row.excerpt || '',
    content: row.content || '',
    tags: row.tags
      ? row.tags.split(';').map(t => t.trim()).filter(t => t)
      : [],
    linkedMarkets: row.linkedMarkets
      ? row.linkedMarkets.split(';').map(m => m.trim()).filter(m => m)
      : [],
    status: row.status || 'draft',
  };
};
