import { useEffect } from 'react';
import { generateBlogSitemap } from '../lib/sitemapGenerator';

export default function SitemapBlog() {
  useEffect(() => {
    const generateSitemap = async () => {
      const sitemap = await generateBlogSitemap();

      // Set content type to XML
      const blob = new Blob([sitemap], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);

      // Download or display
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sitemap-blog.xml';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    };

    generateSitemap();
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Generating sitemap...</p>
    </div>
  );
}
