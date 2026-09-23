import { z } from 'zod';
import { DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES, type DocumentMimeType } from '@carebridge/shared';
import type { DocumentType } from '@prisma/client';
import { prisma, type Tx } from '../config/prisma';

/**
 * Mock document storage. The client sends file metadata only; the stored URL points at a
 * bundled placeholder so the UI can "open" the file. Real object storage is a production item.
 */
export const mockDocumentSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/\.(pdf|jpe?g|png)$/i, 'Only PDF, JPG and PNG files are supported.'),
  mimeType: z.enum(DOCUMENT_MIME_TYPES, 'Only PDF, JPG and PNG files are supported.'),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_BYTES, 'Files must be 10 MB or smaller.'),
  title: z.string().trim().min(1).max(150).optional(),
});

export type MockDocumentInput = z.infer<typeof mockDocumentSchema>;

const PLACEHOLDER_URLS: Record<DocumentMimeType, string> = {
  'application/pdf': '/demo/documents/uploaded-document.pdf',
  'image/jpeg': '/demo/documents/uploaded-image.jpg',
  'image/png': '/demo/documents/uploaded-image.png',
};

export async function createMockDocument(
  input: MockDocumentInput & {
    type: DocumentType;
    uploadedById: string;
    patientId?: string;
    organizationId?: string;
    recordDate?: Date;
    notes?: string;
  },
  tx: Tx = prisma,
) {
  return tx.document.create({
    data: {
      uploadedById: input.uploadedById,
      patientId: input.patientId,
      organizationId: input.organizationId,
      type: input.type,
      title: input.title ?? input.fileName,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageUrl: PLACEHOLDER_URLS[input.mimeType],
      recordDate: input.recordDate,
      notes: input.notes,
    },
  });
}
