import { useEffect, useState } from "react";
import TextStyleControls from "./TextStyleControls";

// Barre flottante qui apparaît au-dessus du texte sélectionné : plus besoin de
// remonter jusqu'à la barre d'outils fixe pour changer le style.

const miniButton = {
  padding: "5px 9px",
  backgroundColor: "#1a1a22",
  color: "#e8e8f0",
  border: "1px solid #2a2a35",
  borderRadius: "4px",
  fontSize: "0.85rem",
  cursor: "pointer",
  minWidth: "30px",
};

export default function BlogBubbleMenu({ editor, containerRef }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!editor) return undefined;

    const update = () => {
      const container = containerRef.current;
      const { from, to, empty } = editor.state.selection;
      if (empty || !container) {
        setPos(null);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const box = container.getBoundingClientRect();
      const left = (start.left + end.right) / 2 - box.left;
      let top = start.top - box.top - 52;
      if (top < 0) top = end.bottom - box.top + 8;
      setPos({ left, top });
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor, containerRef]);

  if (!editor || !pos) return null;

  return (
    <div
      // Empêche le clic sur les boutons de faire perdre la sélection.
      // Les champs natifs (select, couleur) gardent leur comportement normal.
      onMouseDown={(e) => {
        const tag = e.target.tagName;
        if (tag !== "SELECT" && tag !== "INPUT" && tag !== "OPTION") e.preventDefault();
      }}
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        transform: "translateX(-50%)",
        zIndex: 20,
        display: "flex",
        gap: "6px",
        alignItems: "center",
        flexWrap: "wrap",
        maxWidth: "460px",
        padding: "6px",
        backgroundColor: "#0a0a0f",
        border: "1px solid #7c3aed",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      }}
    >
      <button
        type="button"
        title="Gras"
        onClick={() => editor.chain().focus().toggleBold().run()}
        style={{ ...miniButton, backgroundColor: editor.isActive("bold") ? "#7c3aed" : "#1a1a22" }}
      >
        <strong>G</strong>
      </button>
      <button
        type="button"
        title="Italique"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        style={{ ...miniButton, backgroundColor: editor.isActive("italic") ? "#7c3aed" : "#1a1a22" }}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        title="Souligné"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        style={{ ...miniButton, backgroundColor: editor.isActive("underline") ? "#7c3aed" : "#1a1a22" }}
      >
        <u>S</u>
      </button>
      <button
        type="button"
        title="Titre 2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        style={{ ...miniButton, backgroundColor: editor.isActive("heading", { level: 2 }) ? "#7c3aed" : "#1a1a22" }}
      >
        H2
      </button>
      <button
        type="button"
        title="Titre 3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        style={{ ...miniButton, backgroundColor: editor.isActive("heading", { level: 3 }) ? "#7c3aed" : "#1a1a22" }}
      >
        H3
      </button>
      <TextStyleControls editor={editor} />
    </div>
  );
}
