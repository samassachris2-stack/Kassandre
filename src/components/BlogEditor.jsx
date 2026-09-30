import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useState, useRef, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";

// Tous les boutons de cette toolbar vivent dans le <form> de l'admin blog.
// Sans type="button" explicite, un <button> vaut type="submit" par défaut :
// cliquer sur "Image" ou "Gras" soumettait le formulaire et faisait sortir
// de l'édition. C'est corrigé partout ci-dessous.

function ToolButton({ onClick, active, disabled, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...styles.toolButton,
        backgroundColor: active ? "#7c3aed" : "#1a1a22",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function BlogEditor({ content, onChange }) {
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: { style: "max-width: 100%; border-radius: 8px;" },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { style: "color: #a78bfa; text-decoration: underline;" },
      }),
      Placeholder.configure({
        placeholder: "Écris ton article ici...",
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const insertImageFromUrl = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl("");
      setShowImageMenu(false);
    }
  }, [imageUrl, editor]);

  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      setUploading(true);
      try {
        const path = `blog-images/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        editor.chain().focus().setImage({ src: url }).run();
        setShowImageMenu(false);
      } catch (err) {
        console.error("Erreur upload image:", err);
        alert("Erreur lors de l'upload de l'image");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [editor]
  );

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  }, [linkUrl, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div style={styles.container}>
      <style>{`
        .blog-editor-content .ProseMirror {
          min-height: 350px;
          outline: none;
        }
        .blog-editor-content .ProseMirror h2 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #e8e8f0;
          margin: 24px 0 12px 0;
        }
        .blog-editor-content .ProseMirror h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #e8e8f0;
          margin: 20px 0 10px 0;
        }
        .blog-editor-content .ProseMirror p {
          margin: 0 0 14px 0;
        }
        .blog-editor-content .ProseMirror ul,
        .blog-editor-content .ProseMirror ol {
          padding-left: 24px;
          margin: 0 0 14px 0;
        }
        .blog-editor-content .ProseMirror blockquote {
          border-left: 3px solid #7c3aed;
          margin: 16px 0;
          padding: 4px 16px;
          color: #a0a0b0;
          font-style: italic;
        }
        .blog-editor-content .ProseMirror pre {
          background: #0a0a0f;
          border: 1px solid #2a2a35;
          border-radius: 6px;
          padding: 12px 16px;
          overflow-x: auto;
          margin: 16px 0;
        }
        .blog-editor-content .ProseMirror code {
          background: #0a0a0f;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .blog-editor-content .ProseMirror img {
          display: block;
          margin: 16px 0;
        }
        .blog-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: 'Écris ton article ici...';
          color: #5a5a6a;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>

      <div style={styles.toolbar}>
        <ToolButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Annuler"
        >
          ↺
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rétablir"
        >
          ↻
        </ToolButton>

        <div style={styles.separator} />

        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Titre 2"
        >
          H2
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Titre 3"
        >
          H3
        </ToolButton>

        <div style={styles.separator} />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Gras"
        >
          <strong>G</strong>
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italique"
        >
          <em>I</em>
        </ToolButton>

        <div style={styles.separator} />

        <ToolButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Liste à puces"
        >
          • Liste
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Liste numérotée"
        >
          1. Liste
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Citation"
        >
          Citation
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Bloc de code"
        >
          Code
        </ToolButton>

        <div style={styles.separator} />

        <ToolButton
          onClick={() => {
            setLinkUrl(editor.getAttributes("link").href || "");
            setShowLinkInput((v) => !v);
            setShowImageMenu(false);
          }}
          active={editor.isActive("link")}
          title="Lien"
        >
          Lien
        </ToolButton>
        <ToolButton
          onClick={() => {
            setShowImageMenu((v) => !v);
            setShowLinkInput(false);
          }}
          title="Image"
        >
          Image
        </ToolButton>
      </div>

      {showLinkInput && (
        <div style={styles.subBar}>
          <input
            type="text"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            style={styles.input}
            autoFocus
          />
          <button type="button" onClick={applyLink} style={styles.addButton}>
            Appliquer
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            style={{ ...styles.addButton, backgroundColor: "#2a2a35" }}
          >
            Annuler
          </button>
        </div>
      )}

      {showImageMenu && (
        <div style={styles.subBar}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={styles.addButton}
            disabled={uploading}
          >
            {uploading ? "Envoi en cours..." : "Choisir un fichier"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <span style={styles.orText}>ou</span>
          <input
            type="text"
            placeholder="Coller une URL d'image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insertImageFromUrl();
              }
            }}
            style={styles.input}
          />
          <button type="button" onClick={insertImageFromUrl} style={styles.addButton}>
            Insérer
          </button>
          <button
            type="button"
            onClick={() => setShowImageMenu(false)}
            style={{ ...styles.addButton, backgroundColor: "#2a2a35" }}
          >
            Annuler
          </button>
        </div>
      )}

      <div className="blog-editor-content" style={styles.editor}>
        <EditorContent editor={editor} />
      </div>
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
    gap: "6px",
    padding: "10px 12px",
    borderBottom: "1px solid #2a2a35",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: "#0a0a0f",
  },
  separator: {
    width: "1px",
    height: "22px",
    backgroundColor: "#2a2a35",
    margin: "0 4px",
  },
  toolButton: {
    padding: "7px 12px",
    backgroundColor: "#1a1a22",
    color: "#e8e8f0",
    border: "1px solid #2a2a35",
    borderRadius: "4px",
    fontSize: "0.85rem",
    fontWeight: "500",
    transition: "all 0.15s",
    minWidth: "34px",
  },
  subBar: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "12px",
    borderBottom: "1px solid #2a2a35",
    backgroundColor: "#0a0a0f",
    flexWrap: "wrap",
  },
  orText: {
    color: "#6b6b8a",
    fontSize: "0.85rem",
  },
  input: {
    flex: 1,
    minWidth: "180px",
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
    whiteSpace: "nowrap",
  },
  editor: {
    padding: "20px",
    color: "#d0d0e0",
    fontSize: "1rem",
    lineHeight: "1.6",
    cursor: "text",
  },
};
