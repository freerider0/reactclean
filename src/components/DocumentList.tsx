import React, { useState } from 'react';
import { FileText, Download, Trash2, FileCheck, FileKey, FileBadge, FileSpreadsheet, Eye, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from './EmptyState';
import { RequiredDocuments } from './RequiredDocuments';
import { getRequiredDocuments, type RequiredDocument } from '@/config/required-documents.config';
import type { UploadResult } from '@/services/storageService';

interface DocumentListProps {
  documents: UploadResult[];
  propertyType?: string;
  propertyData?: {
    referenciaCatastral?: string;
    direccion?: string;
    ciudad?: string;
  };
  onDelete?: (document: UploadResult) => void;
  onDownload?: (document: UploadResult) => void;
  onSearchOnline?: (document: RequiredDocument) => Promise<void>;
  onCreateDocument?: (document: RequiredDocument) => void;
  className?: string;
}

/**
 * Get icon for document type
 */
const getDocumentIcon = (type: string) => {
  switch (type) {
    case 'identity_document':
      return FileKey;
    case 'property_document':
      return FileCheck;
    case 'certificate':
      return FileBadge;
    case 'contract':
      return FileText;
    case 'technical_document':
      return FileSpreadsheet;
    default:
      return FileText;
  }
};

/**
 * Get document type label in Spanish
 */
const getDocumentTypeLabel = (type: string): string => {
  switch (type) {
    case 'identity_document':
      return 'Documento de Identidad';
    case 'property_document':
      return 'Documento de Propiedad';
    case 'certificate':
      return 'Certificado';
    case 'contract':
      return 'Contrato';
    case 'technical_document':
      return 'Documento Técnico';
    default:
      return 'Documento';
  }
};

/**
 * Extract file name from path
 */
const getFileName = (path?: string): string => {
  if (!path) return 'Documento sin nombre';
  const parts = path.split('/');
  return parts[parts.length - 1] || 'Documento';
};

/**
 * Format file size
 */
const formatFileSize = (url?: string): string => {
  // Since we don't have size info, we'll show a placeholder
  return 'N/A';
};

/**
 * DocumentList component for displaying uploaded documents
 */
export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  propertyType,
  propertyData,
  onDelete,
  onDownload,
  onSearchOnline,
  onCreateDocument,
  className,
}) => {
  const [previewDoc, setPreviewDoc] = useState<UploadResult | null>(null);

  // Filter to show only documents (not photos)
  const documentTypes = [
    'identity_document',
    'property_document',
    'certificate',
    'contract',
    'technical_document',
  ];

  const filteredDocuments = documents.filter(
    (doc) => doc.classification?.type && documentTypes.includes(doc.classification.type)
  );

  // Get required documents for property type
  const requiredDocuments = propertyType ? getRequiredDocuments(propertyType) : [];

  // Show required documents section even if no documents uploaded yet
  const hasRequiredDocs = requiredDocuments.length > 0;

  // Check if file is PDF
  const isPDF = (doc: UploadResult) => {
    return doc.path?.toLowerCase().endsWith('.pdf');
  };

  // Handle preview
  const handlePreview = (doc: UploadResult) => {
    setPreviewDoc(doc);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Required Documents Section */}
      {hasRequiredDocs && (
        <RequiredDocuments
          requiredDocuments={requiredDocuments}
          uploadedDocuments={filteredDocuments}
          propertyData={propertyData}
          onSearchOnline={onSearchOnline}
          onCreateDocument={onCreateDocument}
        />
      )}

      {/* Uploaded Documents Section */}
      {filteredDocuments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">
              Otros Documentos
            </h3>
            <span className="text-sm text-muted-foreground">
              ({filteredDocuments.length})
            </span>
          </div>

          <div className="space-y-2">
            {filteredDocuments.map((doc, index) => {
        const Icon = getDocumentIcon(doc.classification?.type || '');
        const fileName = getFileName(doc.path);
        const typeLabel = getDocumentTypeLabel(doc.classification?.type || '');

        return (
          <div
            key={doc.path || index}
            className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
          >
            {/* Thumbnail Preview or Icon */}
            <div className="flex-shrink-0 relative">
              {isPDF(doc) && doc.url ? (
                // PDF Thumbnail Preview
                <div
                  className="w-20 h-20 rounded-lg overflow-hidden border-2 border-border cursor-pointer hover:border-primary transition-all hover:shadow-md"
                  onClick={() => handlePreview(doc)}
                  title="Click para vista previa completa"
                >
                  <object
                    data={doc.url + '#toolbar=0&navpanes=0&scrollbar=0'}
                    type="application/pdf"
                    className="w-full h-full pointer-events-none scale-110"
                    style={{ objectFit: 'cover' }}
                  >
                    {/* Fallback icon if PDF doesn't load */}
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </object>
                  {/* Eye badge overlay */}
                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
                    <Eye className="w-3 h-3" />
                  </div>
                </div>
              ) : (
                // Regular icon for non-PDF documents
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">
                {fileName}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{typeLabel}</span>
                {doc.classification?.category && (
                  <>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {doc.classification.category}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Preview button (for PDFs) */}
              {isPDF(doc) && doc.url && (
                <button
                  onClick={() => handlePreview(doc)}
                  className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Vista previa"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              {/* Download button */}
              {onDownload && doc.url && (
                <button
                  onClick={() => onDownload(doc)}
                  className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Descargar documento"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              {/* Delete button */}
              {onDelete && (
                <button
                  onClick={() => onDelete(doc)}
                  className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Eliminar documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
          </div>
        </div>
      )}

      {/* Empty State - Only show if no required docs and no uploaded docs */}
      {!hasRequiredDocs && filteredDocuments.length === 0 && (
        <EmptyState
          icon={FileText}
          message="No hay documentos"
          description="Los documentos subidos aparecerán aquí. Sube documentos de identidad, propiedad, certificados, contratos o documentos técnicos."
        />
      )}

      {/* PDF Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {getFileName(previewDoc.path)}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 rounded-md hover:bg-accent transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="w-full h-[calc(100%-4rem)]">
              {isPDF(previewDoc) ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;
