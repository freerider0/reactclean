import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CameraCapture } from './components/CameraCapture';
import { extractAndProcess, type CombinedResponse } from './services/ocrApi';

export const OCRScannerPage: React.FC = () => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CombinedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  /**
   * Handle image capture from camera or upload
   */
  const handleCapture = (file: File) => {
    setCapturedFile(file);
    setCapturedImage(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  /**
   * Process the captured image
   */
  const handleProcess = async () => {
    if (!capturedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const prompt = useCustomPrompt && customPrompt.trim()
        ? customPrompt.trim()
        : undefined;

      const response = await extractAndProcess(capturedFile, prompt);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset and take a new photo
   */
  const handleReset = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <>
      <Helmet>
        <title>OCR Scanner | Document AI</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">OCR Document Scanner</h1>
          <p className="text-gray-600 mt-2">
            Capture or upload documents to extract text and process with AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Camera/Image */}
          <div className="space-y-6">
            {/* Camera or Captured Image */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {capturedImage ? 'Captured Image' : 'Capture Document'}
              </h2>

              {capturedImage ? (
                <div className="space-y-4">
                  <img
                    src={capturedImage}
                    alt="Captured document"
                    className="w-full h-auto rounded-lg border border-gray-200"
                  />

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleReset}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      New Capture
                    </button>
                    <button
                      onClick={handleProcess}
                      disabled={isProcessing}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Extract & Process'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <CameraCapture onCapture={handleCapture} disabled={isProcessing} />
              )}
            </div>

            {/* AI Prompt Options */}
            {capturedImage && !isProcessing && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    AI Processing Options
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCustomPrompt}
                      onChange={(e) => setUseCustomPrompt(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Custom Prompt</span>
                  </label>
                </div>

                {useCustomPrompt ? (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Enter your custom AI prompt... (e.g., 'Translate to Spanish', 'Extract key information', 'Summarize')"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    Default: The AI will analyze and summarize the extracted text
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <p className="font-medium text-blue-900">Processing Document</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Extracting text and processing with AI...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {result && !isProcessing && (
              <>
                {/* Extracted Text */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Extracted Text
                    </h3>
                    <span className="text-xs text-gray-500">
                      {result.extractedText.length} characters
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {result.extractedText || 'No text extracted'}
                    </p>
                  </div>
                </div>

                {/* AI Processed Result */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <svg
                      className="w-5 h-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">
                      AI Analysis
                    </h3>
                    <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      Gemini
                    </span>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {result.processedText}
                    </p>
                  </div>
                </div>

                {/* Entities (if any) */}
                {result.entities && result.entities.length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Detected Entities
                    </h3>
                    <div className="space-y-2">
                      {result.entities.map((entity, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {entity.mentionText}
                            </p>
                            <p className="text-xs text-gray-500">{entity.type}</p>
                          </div>
                          <span className="text-xs text-gray-600">
                            {Math.round(entity.confidence * 100)}% confident
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Info Card (when no results) */}
            {!result && !isProcessing && !error && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg border border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  How It Works
                </h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <strong>Capture:</strong> Take a photo or upload an image of a
                      document
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <strong>Extract:</strong> Google Document AI extracts all text
                      from the image
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      <strong>Process:</strong> Gemini AI analyzes and summarizes
                      the content
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OCRScannerPage;
