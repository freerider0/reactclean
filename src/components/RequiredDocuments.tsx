import React, { useState } from 'react';
import { FileCheck, Search, Plus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequiredDocument } from '@/config/required-documents.config';
import type { UploadResult } from '@/services/storageService';

interface RequiredDocumentsProps {
  requiredDocuments: RequiredDocument[];
  uploadedDocuments: UploadResult[];
  propertyData?: {
    referenciaCatastral?: string;
    direccion?: string;
    ciudad?: string;
  };
  onSearchOnline?: (document: RequiredDocument) => Promise<void>;
  onCreateDocument?: (document: RequiredDocument) => void;
  className?: string;
}

interface DocumentStatus {
  status: 'uploaded' | 'searching' | 'not_found' | 'missing';
  document?: UploadResult;
  message?: string;
}

/**
 * RequiredDocuments component for displaying mandatory documents
 * Shows status: uploaded, available online, or missing with action buttons
 */
export const RequiredDocuments: React.FC<RequiredDocumentsProps> = ({
  requiredDocuments,
  uploadedDocuments,
  propertyData,
  onSearchOnline,
  onCreateDocument,
  className,
}) => {
  const [searchingDocs, setSearchingDocs] = useState<Set<string>>(new Set());

  // Check document status
  const getDocumentStatus = (reqDoc: RequiredDocument): DocumentStatus => {
    // Check if document is uploaded
    const uploadedDoc = uploadedDocuments.find(
      (doc) =>
        doc.classification?.category?.toLowerCase().includes(reqDoc.name.toLowerCase()) ||
        doc.path?.toLowerCase().includes(reqDoc.id)
    );

    if (uploadedDoc) {
      return { status: 'uploaded', document: uploadedDoc };
    }

    if (searchingDocs.has(reqDoc.id)) {
      return { status: 'searching', message: 'Buscando online...' };
    }

    return { status: 'missing' };
  };

  // Handle search online
  const handleSearchOnline = async (reqDoc: RequiredDocument) => {
    if (!onSearchOnline || !reqDoc.apiSearchEndpoint) return;

    setSearchingDocs((prev) => new Set(prev).add(reqDoc.id));

    try {
      await onSearchOnline(reqDoc);
    } finally {
      setSearchingDocs((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reqDoc.id);
        return newSet;
      });
    }
  };

  // Handle create document
  const handleCreateDocument = (reqDoc: RequiredDocument) => {
    if (onCreateDocument) {
      onCreateDocument(reqDoc);
    }
  };

  if (requiredDocuments.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 mb-4">
        <FileCheck className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">
          Documentos Obligatorios
        </h3>
      </div>

      {requiredDocuments.map((reqDoc) => {
        const docStatus = getDocumentStatus(reqDoc);

        return (
          <div
            key={reqDoc.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border-2 transition-colors',
              docStatus.status === 'uploaded'
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-orange-500/50 bg-orange-500/5'
            )}
          >
            {/* Status Icon */}
            <div className="flex-shrink-0">
              {docStatus.status === 'uploaded' ? (
                <div className="rounded-full bg-green-500/10 p-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              ) : docStatus.status === 'searching' ? (
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="rounded-full bg-orange-500/10 p-2">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              )}
            </div>

            {/* Document Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">
                {reqDoc.name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {docStatus.status === 'uploaded'
                  ? '✓ Documento subido'
                  : docStatus.status === 'searching'
                  ? 'Buscando en registros oficiales...'
                  : reqDoc.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {docStatus.status === 'uploaded' ? (
                <span className="text-xs font-medium text-green-600 px-3 py-1 bg-green-500/10 rounded-full">
                  Completo
                </span>
              ) : (
                <>
                  {/* Search Online Button */}
                  {reqDoc.apiSearchEndpoint && propertyData?.referenciaCatastral && (
                    <button
                      onClick={() => handleSearchOnline(reqDoc)}
                      disabled={docStatus.status === 'searching'}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors',
                        'bg-blue-500 text-white hover:bg-blue-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title="Buscar documento online"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Buscar Online
                    </button>
                  )}

                  {/* Create Document Button */}
                  <button
                    onClick={() => handleCreateDocument(reqDoc)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Crear/solicitar documento"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RequiredDocuments;
