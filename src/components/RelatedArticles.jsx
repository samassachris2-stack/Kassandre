import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPublishedArticles } from "../lib/articles";
import { relatedArticles, readingMinutes } from "../lib/blogUtils";

// « À lire aussi » : les articles qui partagent le plus de thèmes avec celui-ci.
export default function RelatedArticles({ current }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let alive = true;
    getPublishedArticles().then((all) => {
      if (alive) setItems(relatedArticles(current, all, 3));
    });
    return () => { alive = false; };
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section style={{ maxWidth: "800px", margin: "48px auto 0" }}>
      <h2 style={{ fontSize: "1.3rem", color: "var(--k-text)", marginBottom: "16px" }}>À lire aussi</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "14px" }}>
        {items.map((a) => (
          <Link key={a.id} to={`/blog/${a.slug}`} style={{ textDecoration: "none", background: "var(--k-surface2)", border: "1px solid var(--k-border)", borderRadius: "10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {a.coverImageUrl && <img src={a.coverImageUrl} alt="" loading="lazy" style={{ width: "100%", height: "120px", objectFit: "cover" }} />}
            <div style={{ padding: "14px" }}>
              <div style={{ color: "var(--k-text)", fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.4, marginBottom: "8px" }}>{a.title}</div>
              <div style={{ color: "var(--k-muted)", fontSize: "0.8rem" }}>{readingMinutes(a.content)} min de lecture</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
