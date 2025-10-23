import React, { useState, useRef } from 'react';
import { uploadPhoto } from '../services/upload';
import './ImageUpload.css';

const ImageUpload = ({ currentImage, onImageChange, label = 'Profile Photo' }) => {
  const [preview, setPreview] = useState(currentImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError('');
    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    const result = await uploadPhoto(file);

    if (result.success) {
      // Pass the file path to parent component
      onImageChange(result.filePath);
    } else {
      setError(result.error);
      setPreview(currentImage);
    }

    setUploading(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload">
      <label className="image-upload-label">{label}</label>

      <div className="image-upload-container">
        {preview ? (
          <div className="image-preview">
            <img src={preview} alt="Preview" />
            <div className="image-overlay">
              <button
                type="button"
                onClick={handleButtonClick}
                className="change-button"
                disabled={uploading}
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="remove-button"
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="image-placeholder" onClick={handleButtonClick}>
            <div className="placeholder-content">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="upload-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p>Click to upload photo</p>
              <span>JPEG, PNG, GIF, or WebP (max 5MB)</span>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {uploading && <p className="upload-status">Uploading...</p>}
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
};

export default ImageUpload;
