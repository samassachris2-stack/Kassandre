import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";

// Image TipTap étendue avec deux attributs custom persistés dans le HTML :
// - width  : largeur en pixels, réglée en glissant la poignée
// - align  : "left" | "center" | "right" | null, réglée via la mini-toolbar
// L'alignement gauche/droite utilise `float` pour que le texte s'enroule
// autour de l'image, comme le comportement "habillage du texte" de Word.

function ResizableImageView({ node, updateAttributes, selected }) {
  const { src, alt, width, align } = node.attrs;
  const imgRef = useRef(null);
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = imgRef.current?.offsetWidth || width || 300;
      setResizing(true);

      const onMouseMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(80, Math.round(startWidth + delta));
        updateAttributes({ width: newWidth });
      };
      const onMouseUp = () => {
        setResizing(false);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [width, updateAttributes]
  );

  // Le centrage se fait avec text-align sur le wrapper (bloc pleine largeur)
  // autour d'un enfant inline-block : un margin:auto ne centrerait rien ici
  // puisque le wrapper span-devenu-bloc occupe déjà toute la largeur.
  // Gauche/droite utilisent float, qui se redimensionne toujours au contenu
  // (pas besoin de largeur explicite pour que ça marche).
  const wrapperStyle = {
    position: "relative",
    lineHeight: 0,
    ...(align === "left" && {
      display: "block",
      float: "left",
      margin: "4px 20px 12px 0",
    }),
    ...(align === "right" && {
      display: "block",
      float: "right",
      margin: "4px 0 12px 20px",
    }),
    ...((align === "center" || !align) && {
      display: "block",
      textAlign: "center",
      margin: "16px 0",
      float: "none",
    }),
  };

  return (
    <NodeViewWrapper as="span" style={wrapperStyle} data-drag-handle>
      <div
        style={{
          position: "relative",
          display: "inline-block",
          outline: selected ? "2px solid #7c3aed" : "none",
          borderRadius: "8px",
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          style={{
            display: "block",
            // Par défaut (avant tout redimensionnement manuel), l'image
            // garde une taille raisonnable au lieu de forcer 100% de la
            // largeur : forcer 100% rendait le centrage invisible, l'image
            // remplissant déjà tout l'espace disponible.
            width: width ? `${width}px` : "min(640px, 100%)",
            maxWidth: "100%",
            borderRadius: "8px",
            userSelect: "none",
          }}
          draggable={false}
        />

        {selected && (
          <>
            <div style={toolbarStyle}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ align: "left" })}
                style={miniBtn(align === "left")}
                title="Aligner à gauche, texte à droite"
              >
                ⬅
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ align: "center" })}
                style={miniBtn(align === "center" || !align)}
                title="Centrer"
              >
                ⬛
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ align: "right" })}
                style={miniBtn(align === "right")}
                title="Aligner à droite, texte à gauche"
              >
                ➡
              </button>
              <span style={{ width: "1px", background: "#2a2a35", margin: "0 2px" }} />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => updateAttributes({ width: null })}
                style={miniBtn(false)}
                title="Taille originale"
              >
                ↺
              </button>
            </div>

            <div
              onMouseDown={startResize}
              style={{
                position: "absolute",
                right: "-6px",
                bottom: "-6px",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                background: "#7c3aed",
                border: "2px solid #0a0a0f",
                cursor: "nwse-resize",
                zIndex: 5,
              }}
              title="Glisser pour redimensionner"
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

const toolbarStyle = {
  position: "absolute",
  top: "-40px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "2px",
  padding: "4px",
  background: "#0a0a0f",
  border: "1px solid #2a2a35",
  borderRadius: "6px",
  zIndex: 10,
  whiteSpace: "nowrap",
};

function miniBtn(active) {
  return {
    padding: "4px 8px",
    background: active ? "#7c3aed" : "transparent",
    color: "#e8e8f0",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.8rem",
    lineHeight: 1,
  };
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: null,
        renderHTML: (attrs) => (attrs.align ? { "data-align": attrs.align } : {}),
        parseHTML: (el) => el.getAttribute("data-align"),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;
