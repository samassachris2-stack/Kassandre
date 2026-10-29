import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { useState, useRef, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
import { prepareImageForUpload } from "../lib/imageUtils";
import { safeFileName } from "../lib/cssUrl";
import ResizableImage from "./ResizableImage";
import TextStyleControls from "./TextStyleControls";
import { TextStyleExtras } from "../lib/tiptapTextStyle";
import { notify } from "../lib/notify";

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
        backgroundColor: active ? "var(--k-accent)" : "var(--k-surface2)",
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

// Envoie une image collée ou déposée vers Storage et renvoie son URL.
// (Sans ça, l'image restait en base64 dans le texte et dépassait la limite
// d'1 Mo d'un document Firestore : "Erreur lors de l'enregistrement".)
async function uploadEditorImage(file) {
  const blob = await prepareImageForUpload(file).catch(() => file);
  const path = `blog-images/${Date.now()}_${safeFileName(file.name || "image.jpg")}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type || "image/jpeg" });
  return getDownloadURL(storageRef);
}

async function insertUploadedImages(view, files) {
  for (const file of files) {
    try {
      const url = await uploadEditorImage(file);
      const type = view.state.schema.nodes.image;
      view.dispatch(view.state.tr.replaceSelectionWith(type.create({ src: url })));
    } catch (err) {
      console.error("Erreur upload image:", err);
      notify("Erreur lors de l'upload de l'image", "error");
    }
  }
}

function imageFilesOf(dt) {
  return Array.from(dt?.files || []).filter((f) => f.type.startsWith("image/"));
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
      Underline,
      TextStyle,
      Color,
      TextStyleExtras,
      ResizableImage.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { style: "color: var(--k-accent-text); text-decoration: underline;" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Placeholder.configure({
        placeholder: "Écris ton article ici...",
      }),
    ],
    content: content,
    editorProps: {
      handlePaste: (view, event) => {
        const files = imageFilesOf(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        notify("Envoi de l'image...", "success");
        insertUploadedImages(view, files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = imageFilesOf(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        insertUploadedImages(view, files);
        return true;
      },
    },
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
        const path = `blog-images/${Date.now()}_${safeFileName(file.name)}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        editor.chain().focus().setImage({ src: url }).run();
        setShowImageMenu(false);
      } catch (err) {
        console.error("Erreur upload image:", err);
        notify("Erreur lors de l'upload de l'image", "error");
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
          color: var(--k-text);
          margin: 24px 0 12px 0;
        }
        .blog-editor-content .ProseMirror h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--k-text);
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
          border-left: 3px solid var(--k-accent);
          margin: 16px 0;
          padding: 4px 16px;
          color: var(--k-muted2);
          font-style: italic;
        }
        .blog-editor-content .ProseMirror pre {
          background: var(--k-bg);
          border: 1px solid var(--k-border);
          border-radius: 6px;
          padding: 12px 16px;
          overflow-x: auto;
          margin: 16px 0;
        }
        .blog-editor-content .ProseMirror code {
          background: var(--k-bg);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .blog-editor-content .ProseMirror hr {
          border: none;
          border-top: 1px solid var(--k-border);
          margin: 24px 0;
        }
        .blog-editor-content .ProseMirror::after {
          content: '';
          display: table;
          clear: both;
        }
        .blog-editor-content .ProseMirror u {
          text-decoration: underline;
        }
        .blog-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: 'Écris ton article ici...';
          color: var(--k-faint);
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
        <ToolButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Souligné"
        >
          <u>S</u>
        </ToolButton>

        <div style={styles.separator} />

        <TextStyleControls editor={editor} />

        <div style={styles.separator} />

        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Aligner le texte à gauche"
        >
          ⬅
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centrer le texte"
        >
          ⬛
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Aligner le texte à droite"
        >
          ➡
        </ToolButton>
        <ToolButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Justifier"
        >
          ☰
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
        <ToolButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Ligne de séparation"
        >
          ―
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
            style={{ ...styles.addButton, backgroundColor: "var(--k-border)" }}
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
            style={{ ...styles.addButton, backgroundColor: "var(--k-border)" }}
          >
            Annuler
          </button>
        </div>
      )}

      <div className="blog-editor-content" style={styles.editor}>
        <EditorContent editor={editor} />
      </div>    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "var(--k-surface2)",
    borderRadius: "8px",
    border: "1px solid var(--k-border)",
    // "clip" arrondit les coins sans créer de conteneur de défilement,
    // ce qui laisse la barre d'outils collante fonctionner.
    overflow: "clip",
  },
  toolbar: {
    position: "sticky",
    // La navbar du site est masquée sur /admin/blog, la barre colle donc en haut
    top: 0,
    zIndex: 10,
    display: "flex",
    gap: "6px",
    padding: "10px 12px",
    borderBottom: "1px solid var(--k-border)",
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: "var(--k-bg)",
  },
  separator: {
    width: "1px",
    height: "22px",
    backgroundColor: "var(--k-border)",
    margin: "0 4px",
  },
  toolButton: {
    padding: "7px 12px",
    backgroundColor: "var(--k-surface2)",
    color: "var(--k-text)",
    border: "1px solid var(--k-border)",
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
    borderBottom: "1px solid var(--k-border)",
    backgroundColor: "var(--k-bg)",
    flexWrap: "wrap",
  },
  orText: {
    color: "var(--k-faint)",
    fontSize: "0.85rem",
  },
  input: {
    flex: 1,
    minWidth: "180px",
    padding: "8px 12px",
    backgroundColor: "var(--k-surface2)",
    color: "var(--k-text)",
    border: "1px solid var(--k-border)",
    borderRadius: "4px",
    fontSize: "0.9rem",
  },
  addButton: {
    padding: "8px 16px",
    backgroundColor: "var(--k-accent)",
    color: "var(--k-text)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  editor: {
    padding: "20px",
    color: "var(--k-text)",
    fontSize: "1rem",
    lineHeight: "1.6",
    cursor: "text",
  },
};
