import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useState } from "react";

export default function BlogEditor({ content, onChange }) {
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageInput(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{
            ...styles.toolButton,
            backgroundColor: editor.isActive("bold") ? "#7c3aed" : "#1a1a22",
          }}
        >
          Gras
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{
            ...styles.toolButton,
            backgroundColor: editor.isActive("italic") ? "#7c3aed" : "#1a1a22",
          }}
        >
          Italique
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          style={{
            ...styles.toolButton,
            backgroundColor: editor.isActive("heading", { level: 2 })
              ? "#7c3aed"
              : "#1a1a22",
          }}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          style={{
            ...styles.toolButton,
            backgroundColor: editor.isActive("heading", { level: 3 })
              ? "#7c3aed"
              : "#1a1a22",
          }}
        >
          H3
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={{
            ...styles.toolButton,
            backgroundColor: editor.isActive("bulletList") ? "#7c3aed" : "#1a1a22",
          }}
        >
          Liste
        </button>
        <button
          onClick={() => setShowImageInput(!showImageInput)}
          style={styles.toolButton}
        >
          Image
        </button>
      </div>

      {showImageInput && (
        <div style={styles.imageInput}>
          <input
            type="text"
            placeholder="URL de l'image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={styles.input}
          />
          <button onClick={addImage} style={styles.addButton}>
            Ajouter
          </button>
          <button
            onClick={() => setShowImageInput(false)}
            style={{ ...styles.addButton, backgroundColor: "#2a2a35" }}
          >
            Annuler
          </button>
        </div>
      )}

      <EditorContent editor={editor} style={styles.editor} />
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#1a1a22",
    borderRadius: "8px",
    border: "1px solid #2a2a35",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    padding: "12px",
    borderBottom: "1px solid #2a2a35",
    flexWrap: "wrap",
    backgroundColor: "#0a0a0f",
  },
  toolButton: {
    padding: "8px 16px",
    backgroundColor: "#1a1a22",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "500",
    transition: "all 0.2s",
  },
  imageInput: {
    display: "flex",
    gap: "8px",
    padding: "12px",
    borderBottom: "1px solid #2a2a35",
    backgroundColor: "#0a0a0f",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    backgroundColor: "#1a1a22",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
    borderRadius: "4px",
    fontSize: "0.9rem",
  },
  addButton: {
    padding: "8px 16px",
    backgroundColor: "#7c3aed",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
  },
  editor: {
    minHeight: "400px",
    padding: "20px",
    color: "#d0d0e0",
    fontSize: "1rem",
    lineHeight: "1.6",
  },
};
