import React, { useState, useRef } from 'react';
import { Upload, Camera, RefreshCw, AlertCircle, FileCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import { useAuth } from '../../context/AuthContext.js';

export const Step2PhotoUpload: React.FC = () => {
  const { state, updateState, nextStep, prevStep } = useRepairFlow();
  const { token } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string>(state.photoUrl || '');
  const [fileName, setFileName] = useState<string>(state.photoOriginalName || '');
  const [fileSizeText, setFileSizeText] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

  const validateAndProcessFile = async (file: File) => {
    setUploadError(null);

    // Validate size
    if (file.size > MAX_SIZE) {
      setUploadError('Image size exceeds 10 MB limit. Please select a smaller photo or compress it.');
      return;
    }

    // Validate format
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isAllowedExt = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp'].includes(ext);
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase()) && !isAllowedExt) {
      setUploadError('Unsupported file type. Please upload a JPG, PNG, or HEIC photo.');
      return;
    }

    // Set local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    setFileSizeText(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);

    // Perform actual upload to backend
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Server upload failed.');
      }

      updateState({
        photoUrl: json.data.url,
        photoOriginalName: json.data.originalName
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload photo. You may retry or continue with the local preview.');
      // Keep local preview so customer is not blocked
      updateState({
        photoUrl: objectUrl,
        photoOriginalName: file.name
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleReplace = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleContinue = () => {
    if (!previewUrl) {
      setUploadError('Please provide a photo of the damaged device to proceed.');
      return;
    }
    nextStep();
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6 text-center sm:text-left">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary mb-2">
          Upload Device Photo
        </h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Provide a clear photo of your device showing the front screen or housing fracture. This assists our service engineers in assessing impact depth and chassis alignment.
        </p>
      </div>

      {uploadError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 p-3 bg-base-surface border border-red-300 dark:border-red-900/50 rounded-control flex items-start gap-2 text-xs text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic"
        onChange={handleFileChange}
        className="hidden"
        id="device-photo-input"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        id="device-camera-input"
      />

      {/* Preview Card or Drop Area */}
      {!previewUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-base-border hover:border-accent/60 rounded-card p-8 sm:p-12 text-center bg-base-surface transition-colors"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-base-muted flex items-center justify-center text-accent">
            <Upload className="w-6 h-6" />
          </div>

          <h3 className="font-heading text-lg font-medium text-ink-primary mb-1">
            Drag and drop your device photo here
          </h3>
          <p className="text-xs text-ink-muted mb-6">
            Accepts JPG, PNG, and HEIC files up to 10 MB.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 bg-accent text-accent-text hover:bg-accent-hover text-xs font-medium rounded-control transition-colors"
            >
              Browse Files from Computer
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-full sm:w-auto px-5 py-2.5 bg-base-muted hover:bg-base-border text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-accent" />
              <span>Capture via Camera</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Image View */}
            <div className="w-full md:w-56 h-56 bg-base-muted rounded-control overflow-hidden border border-base-border flex items-center justify-center shrink-0">
              <img
                src={previewUrl}
                alt="Uploaded damaged device preview"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Metadata and Controls */}
            <div className="flex-1 w-full">
              <div className="flex items-center gap-2 text-xs font-medium text-accent mb-1">
                <FileCheck className="w-4 h-4" />
                <span>Photo Ready for Diagnostic Assessment</span>
              </div>

              <h4 className="font-heading text-base font-semibold text-ink-primary mb-1 break-all">
                {fileName || 'device_inspection_photo.jpg'}
              </h4>

              {fileSizeText && (
                <p className="text-xs text-ink-muted mb-4">
                  File Size: {fileSizeText}
                </p>
              )}

              {isUploading ? (
                <p className="text-xs text-accent animate-pulse mb-4">
                  Synchronising image with secure storage...
                </p>
              ) : (
                <p className="text-xs text-ink-secondary mb-4 leading-relaxed">
                  Image validated. The service team will cross-reference this photograph against the internal bench inspection checklist.
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReplace}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-base-muted hover:bg-base-border text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-base-muted hover:bg-base-border text-ink-primary text-xs font-medium rounded-control border border-base-border transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Take New Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-base-border">
        <button
          type="button"
          onClick={prevStep}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Account</span>
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!previewUrl || isUploading}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium bg-accent text-accent-text hover:bg-accent-hover rounded-control disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>Continue to Device Specs</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
