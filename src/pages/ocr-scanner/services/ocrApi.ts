const API_BASE_URL = 'http://localhost:3001';

export interface OCRResponse {
  success: boolean;
  text: string;
  entities?: Array<{
    type: string;
    mentionText: string;
    confidence: number;
  }>;
  pages?: Array<{
    pageNumber: number;
    width: number;
    height: number;
    blocks: number;
    paragraphs: number;
    lines: number;
    tokens: number;
  }>;
  metadata?: {
    mimeType: string;
    textLength: number;
  };
}

export interface GeminiResponse {
  success: boolean;
  result: string;
  model: string;
  metadata?: {
    inputLength: number;
    outputLength: number;
  };
}

export interface CombinedResponse {
  success: boolean;
  extractedText: string;
  processedText: string;
  entities?: Array<{
    type: string;
    mentionText: string;
    confidence: number;
  }>;
  metadata?: {
    model: string;
    extractedTextLength: number;
    processedTextLength: number;
  };
}

/**
 * Extract text from image using Document AI
 */
export async function extractTextFromImage(imageFile: File): Promise<OCRResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${API_BASE_URL}/api/ai/ocr-id-document`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to extract text');
  }

  return response.json();
}

/**
 * Process text with Gemini AI
 */
export async function processTextWithGemini(
  text: string,
  prompt?: string
): Promise<GeminiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ai/analyze-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, prompt }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to process with Gemini');
  }

  return response.json();
}

/**
 * Extract text and process with Gemini in one call
 */
export async function extractAndProcess(
  imageFile: File,
  prompt?: string
): Promise<CombinedResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);
  if (prompt) {
    formData.append('prompt', prompt);
  }

  const response = await fetch(`${API_BASE_URL}/api/ai/enrich-id-document`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to process document');
  }

  return response.json();
}
