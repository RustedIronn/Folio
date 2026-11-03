// Presentation only. All business values have already been resolved.
export const LETTER = { width: 612, height: 792 };

export function pdfOutputFileName(fileName, variant) {
  return variant === "printable" ? fileName.replace(/\.pdf$/i, "") + "-print-friendly.pdf" : fileName;
}

export function displayDate(value) {
  const date = String(value ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join(".") : date;
}

export function displayPrice(formatted) {
  const amount = String(formatted ?? "").replace(/^₹\s*/, "");
  return amount ? `Rs. ${amount}/-` : "";
}

export function displayCapacity(capacity) {
  return String(capacity ?? "").replace(/^(\d+) Persons - Maximum Load - ([\d.]+) Kgs$/, "$1 Persons, $2 Kg");
}

export function displayTravelHeight(value) {
  const travel = String(value ?? "").trim();
  return /^\d+$/.test(travel) ? `G + ${travel}` : travel;
}

export function displayDimensions(value, axes) {
  const dimensions = String(value ?? "").trim();
  const match = dimensions.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(mm)?$/i);
  if (!match) return dimensions;
  const parts = match.slice(1, 4).filter((part) => part !== undefined);
  if (parts.length > axes.length) return dimensions;
  return parts.map((part, index) => `${axes[index]} ${part}`).join(" × ") + (match[4] ? " mm" : "");
}

// PDF generation must fail explicitly rather than return clipped printable content.
// React PDF exposes the same layout tree to both its browser and Node onRender callbacks.
export function assertDocumentLayout({ _INTERNAL__LAYOUT__DATA_: layout }) {
  if (!layout?.children || layout.children.length !== 6) throw new Error("The quotation must contain six pages.");
  for (const page of layout.children) {
    if (Math.abs(page.box.width - LETTER.width) > 0.1 || Math.abs(page.box.height - LETTER.height) > 0.1) throw new Error("The quotation page size is incorrect.");
    function inspect(node, left = 0, top = 0, region = null) {
      const x = left + (node.box?.left ?? 0);
      const y = top + (node.box?.top ?? 0);
      if (node.props?.id?.startsWith("pdf-region:")) region = { label: node.props.id.slice(11), x, y, right: x + node.box.width, bottom: y + node.props["data-printable-height"] };
      if (region && node.type === "TEXT" && node.box) {
        if (x < region.x - 0.5 || x + node.box.width > region.right + 0.5 || y < region.y - 0.5 || y + node.box.height > region.bottom + 0.5) throw new Error(`${region.label} exceeds its printable area. Shorten the entered text and preview again.`);
        if (node.lines?.some((line) => line.box.x + line.xAdvance - (line.overflowRight ?? 0) > node.box.width + 0.5)) throw new Error(`${region.label} contains text that is too wide. Add spaces or shorten the entered text and preview again.`);
      }
      for (const child of node.children ?? []) inspect(child, x, y, region);
    }
    inspect(page);
  }
}
