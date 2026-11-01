import { PDFDownloadLink, PDFViewer } from "@react-pdf/renderer";
import AltisQuotationPdf from "./AltisQuotationPdf.jsx";
import Button from "../app/components/Button.jsx";

export default function PdfPreview({ documentData, fileName, downloadEnabled }) {
  const document = <AltisQuotationPdf documentData={documentData} />;
  return <div className="pdf-preview-panel">
    <div className="pdf-preview-toolbar">
      <div><h3>{downloadEnabled ? "Quotation preview" : "Draft quotation preview"}</h3><p>{downloadEnabled ? "This is ready for download." : "Missing values are left blank in this draft preview. Complete the required entries before downloading."}</p></div>
      {downloadEnabled && <PDFDownloadLink document={document} fileName={fileName}>{({ loading, error }) => <Button loading={loading} disabled={Boolean(error)}>{error ? "PDF generation failed" : loading ? "Preparing download…" : "Download quotation"}</Button>}</PDFDownloadLink>}
    </div>
    <PDFViewer className="pdf-viewer" showToolbar><AltisQuotationPdf documentData={documentData} /></PDFViewer>
  </div>;
}
