import React from 'react';
import { getPhotoUrl } from '../services/upload';
import './BrandAvatar.css';

/**
 * BrandAvatar - Shows company logo with optional overlapping person photo
 *
 * For brands with company info: displays company logo with small person photo overlay
 * For older brands without company info: displays single avatar (fallback)
 * Not used for ambassadors
 *
 * Props:
 * - companyLogo: company_logo field (or falls back to profile_photo if null)
 * - personPhoto: profile_photo field (contact person's photo)
 * - companyName: company_name field
 * - personName: name field (contact person's name)
 */
const BrandAvatar = ({
  companyLogo,
  personPhoto,
  companyName,
  personName,
  size = 'medium'
}) => {
  // Get first letter for fallback
  const companyInitial = companyName?.charAt(0).toUpperCase() || '?';
  const personInitial = personName?.charAt(0).toUpperCase() || '?';

  // Determine if this is a new brand (has company name) or old brand (fallback to single avatar)
  const hasCompanyInfo = Boolean(companyName);

  // For old brands without company info, just show a single avatar
  if (!hasCompanyInfo) {
    return (
      <div className={`brand-avatar brand-avatar-${size} brand-avatar-single`}>
        {companyLogo ? (
          <img
            src={getPhotoUrl(companyLogo)}
            alt={personName || 'Brand'}
            className="brand-avatar-main"
          />
        ) : (
          <div className="brand-avatar-main brand-avatar-placeholder">
            {personInitial}
          </div>
        )}
      </div>
    );
  }

  // New brand with company info - show company logo with optional person overlay
  return (
    <div className={`brand-avatar brand-avatar-${size}`}>
      {/* Main circle - Company Logo */}
      {companyLogo ? (
        <img
          src={getPhotoUrl(companyLogo)}
          alt={companyName}
          className="brand-avatar-main"
        />
      ) : (
        <div className="brand-avatar-main brand-avatar-placeholder">
          {companyInitial}
        </div>
      )}

      {/* Small overlapping circle - Person Photo (only if personName exists) */}
      {personName && (
        <div className="brand-avatar-person">
          {personPhoto ? (
            <img
              src={getPhotoUrl(personPhoto)}
              alt={personName}
              className="brand-avatar-person-img"
            />
          ) : (
            <div className="brand-avatar-person-placeholder">
              {personInitial}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandAvatar;
