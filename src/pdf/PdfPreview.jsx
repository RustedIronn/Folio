import { useMemo } from "react";
import { BlobProvider } from "@react-pdf/renderer";
import AltisQuotationPdf from "./AltisQuotationPdf.jsx";
import Button from "../app/components/Button.jsx";

export default function PdfPreview({ documentData, fileName, downloadEnabled }) {
  const document = useMemo(() => <AltisQuotationPdf documentData={documentData} />, [documentData]);
  // Remount on changed data so a previous successful blob is never downloadable
  // while a new quotation is loading or has failed the printable-area checks.
  return <BlobProvider key={JSON.stringify(documentData)} document={document}>{({ url, loading, error }) => <div className="pdf-preview-panel">
    <div className="pdf-preview-toolbar">
      <div><h3>{downloadEnabled ? "Quotation preview" : "Draft quotation preview"}</h3><p>{downloadEnabled ? "This is ready for download." : "Missing values are left blank in this draft preview. Complete the required entries before downloading."}</p></div>
      <div className="pdf-document-actions">
        {url && !loading && !error && <a className="button button-secondary" href={`${url}#view=FitH&navpanes=0`} target="_blank" rel="noopener noreferrer" aria-label="Open quotation PDF in a new tab">Open PDF</a>}
        {downloadEnabled && (url && !loading && !error ? <a className="button button-primary" href={url} download={fileName}>Download quotation</a> : <Button loading={loading} disabled>{error ? "PDF generation failed" : "Preparing download…"}</Button>)}
      </div>
    </div>
    {error ? <p className="source-warning" role="alert">{error.message || "The document could not be prepared. Review the entered text and try again."}</p> : loading || !url ? <div className="pdf-loading" role="status">Preparing quotation preview…</div> : <iframe className="pdf-viewer" src={`${url}#view=FitH&navpanes=0`} title={downloadEnabled ? "Altis quotation PDF" : "Draft Altis quotation PDF"} />}
  </div>}</BlobProvider>;
}
