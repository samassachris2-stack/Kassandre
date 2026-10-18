import { useEditorState } from "@tiptap/react";
import { FONT_SIZES, FONT_FAMILIES } from "../lib/tiptapTextStyle";

const controlStyle = {
  padding: "6px 8px",
  backgroundColor: "#1a1a22",
  color: "#e8e8f0",
  border: "1px solid #2a2a35",
  borderRadius: "4px",
  fontSize: "0.85rem",
  height: "34px",
};

// Contrôles de taille, police et couleur du texte. Utilisés à la fois dans la
// barre d'outils fixe et dans la barre flottante de sélection.
export default function TextStyleControls({ editor }) {
  const fontSize = useEditorState({
    editor,
    selector: ({ editor: e }) => e.getAttributes("textStyle").fontSize || "",
  });
  const fontFamily = useEditorState({
    editor,
    selector: ({ editor: e }) => e.getAttributes("textStyle").fontFamily || "",
  });
  const color = useEditorState({
    editor,
    selector: ({ editor: e }) => e.getAttributes("textStyle").color || "",
  });

  const currentFamily = FONT_FAMILIES.find((f) => f.value === fontFamily)?.value ?? "";

  return (
    <>
      <select
        title="Taille du texte"
        value={FONT_SIZES.includes(fontSize) ? fontSize : ""}
        onChange={(e) => {
          const value = e.target.value;
          if (value) editor.chain().focus().setFontSize(value).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
        style={controlStyle}
      >
        <option value="">Taille</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size.replace("px", "")}
          </option>
        ))}
      </select>

      <select
        title="Police"
        value={currentFamily}
        onChange={(e) => {
          const value = e.target.value;
          if (value) editor.chain().focus().setFontFamily(value).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        style={controlStyle}
      >
        {FONT_FAMILIES.map((family) => (
          <option key={family.label} value={family.value}>
            {family.label}
          </option>
        ))}
      </select>

      <input
        type="color"
        title="Couleur du texte"
        value={color || "#e8e8f0"}
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        style={{ ...controlStyle, width: "42px", padding: "3px", cursor: "pointer" }}
      />
      <button
        type="button"
        title="Couleur par défaut"
        onClick={() => editor.chain().focus().unsetColor().run()}
        style={{ ...controlStyle, cursor: "pointer" }}
      >
        ✕
      </button>
    </>
  );
}
