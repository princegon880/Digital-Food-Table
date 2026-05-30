import { useState, useEffect } from 'react';
import { api, resolveImageUrl } from '../../utils/api';
import { triggerHaptic } from '../../utils/haptic';
import { Save, User, Phone, Globe, Image as ImageIcon, Upload, Check, Calendar, Link2, MessageCircle, Monitor, Layers } from 'lucide-react';

export default function Settings() {
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('profile') || '{}'));
  
  const [restaurantName, setRestaurantName] = useState(profile.restaurant_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || '');
  const [currency, setCurrency] = useState(profile.currency || '₹');
  const [coverImage, setCoverImage] = useState(profile.cover_image || '');
  const [establishedYear, setEstablishedYear] = useState(profile.established_year || '2026');
  const [tagline, setTagline] = useState(profile.tagline || 'Premium Dining Experience');
  const [slug, setSlug] = useState(profile.slug || '');
  const [orderMode, setOrderMode] = useState(profile.order_mode || 'both');
  
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch fresh profile on mount to sync
  useEffect(() => {
    async function fetchFreshProfile() {
      try {
        const data = await api.get('/auth/me');
        if (data && data.profile) {
          localStorage.setItem('profile', JSON.stringify(data.profile));
          setProfile(data.profile);
          setRestaurantName(data.profile.restaurant_name || '');
          setPhoneNumber(data.profile.phone_number || '');
          setCurrency(data.profile.currency || '₹');
          setCoverImage(data.profile.cover_image || '');
          setEstablishedYear(data.profile.established_year || '2026');
          setTagline(data.profile.tagline || 'Premium Dining Experience');
          setSlug(data.profile.slug || '');
          setOrderMode(data.profile.order_mode || 'both');
        }
      } catch (err) {
        console.error('Failed to fetch profile in settings:', err);
      }
    }
    fetchFreshProfile();
  }, []);

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    try {
      const data = await api.post('/items/upload', formData, true);
      return data.imageUrl;
    } catch (err) {
      alert('Cover image upload failed: ' + err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError('');

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      triggerHaptic('error');
      setError('WhatsApp number must be exactly 10 digits.');
      setSaving(false);
      return;
    }

    try {
      let finalCoverImage = coverImage;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          finalCoverImage = uploadedUrl;
          setCoverImage(uploadedUrl);
          setImageFile(null);
        }
      }

      const updatedProfile = await api.put('/auth/profile', {
        restaurantName,
        phoneNumber,
        currency,
        coverImage: finalCoverImage,
        establishedYear,
        tagline,
        slug,
        orderMode
      });

      // Update local storage and state
      localStorage.setItem('profile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      setSlug(updatedProfile.slug);
      setSuccess(true);
      triggerHaptic('success');
      // Auto fade success badge
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      triggerHaptic('error');
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-wrapper animated">
      <div className="dash-header">
        <div>
          <h2>Settings</h2>
          <p>Configure restaurant configurations, currency, and WhatsApp forwarding.</p>
        </div>
      </div>

      <div className="settings-container">
        <form onSubmit={handleSave} className="glass settings-form-card">
          <div className="card-header-flex">
            <h3>Restaurant Configuration</h3>
            {success && (
              <span className="success-tag badge badge-success">
                <Check size={12} /> Saved Successfully
              </span>
            )}
          </div>

          {error && (
            <div className="error-alert" style={{ color: '#ffffff', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '10px' }}>
              ❌ {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Restaurant Name</label>
            <div className="input-with-icon">
              <User className="input-icon" size={18} />
              <input 
                type="text" 
                className="form-control"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">URL Slug (Custom Menu Link)</label>
            <div className="input-with-icon">
              <Link2 className="input-icon" size={18} />
              <input 
                type="text" 
                className="form-control"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. cafe-aroma"
                required
              />
            </div>
            {slug !== profile.slug && profile.slug && (
              <span className="input-hint" style={{ display: 'block', marginTop: '6px', color: '#f59e0b', fontWeight: 'bold' }}>
                ⚠️ Warning: Changing this will invalidate your existing printed QR codes!
              </span>
            )}
            <span className="input-hint" style={{ display: 'block', marginTop: '4px' }}>
              Your menu link: <strong style={{ color: 'var(--primary)' }}>{window.location.origin}/menu/{slug || 'your-slug'}</strong>
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Restaurant Tagline</label>
            <div className="input-with-icon">
              <input 
                type="text" 
                className="form-control"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Premium Dining Experience"
                style={{ paddingLeft: '16px' }}
              />
            </div>
            <span className="input-hint">This tagline displays under the restaurant name on your menu page.</span>
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Forwarding Number</label>
            <div className="input-with-icon">
              <Phone className="input-icon" size={18} />
              <input 
                type="tel" 
                className="form-control"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 9876543210"
                maxLength={10}
                required
              />
            </div>
            <span className="input-hint">10-digit mobile number without country code or spaces.</span>
          </div>

          {/* Order Notification Mode */}
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>Order Notification Mode</label>
            <p className="input-hint" style={{ marginBottom: '12px' }}>Choose how you want to receive orders from customers.</p>
            <div className="order-mode-grid">
              
              <button
                type="button"
                id="order-mode-whatsapp"
                className={`order-mode-card ${orderMode === 'whatsapp' ? 'active' : ''}`}
                onClick={() => { triggerHaptic('light'); setOrderMode('whatsapp'); }}
              >
                <div className="mode-icon-box whatsapp">
                  <MessageCircle size={22} />
                </div>
                <div className="mode-text">
                  <strong>WhatsApp Only</strong>
                  <span>Orders open WhatsApp. Kitchen dashboard is not updated.</span>
                </div>
                <div className={`mode-radio ${orderMode === 'whatsapp' ? 'selected' : ''}`} />
              </button>

              <button
                type="button"
                id="order-mode-dashboard"
                className={`order-mode-card ${orderMode === 'dashboard' ? 'active' : ''}`}
                onClick={() => { triggerHaptic('light'); setOrderMode('dashboard'); }}
              >
                <div className="mode-icon-box dashboard">
                  <Monitor size={22} />
                </div>
                <div className="mode-text">
                  <strong>Live Dashboard Only</strong>
                  <span>Orders go to your kitchen screen. WhatsApp is not opened.</span>
                </div>
                <div className={`mode-radio ${orderMode === 'dashboard' ? 'selected' : ''}`} />
              </button>

              <button
                type="button"
                id="order-mode-both"
                className={`order-mode-card ${orderMode === 'both' ? 'active' : ''}`}
                onClick={() => { triggerHaptic('light'); setOrderMode('both'); }}
              >
                <div className="mode-icon-box both">
                  <Layers size={22} />
                </div>
                <div className="mode-text">
                  <strong>WhatsApp + Dashboard</strong>
                  <span>Both happen simultaneously. Recommended for most restaurants.</span>
                </div>
                <div className={`mode-radio ${orderMode === 'both' ? 'selected' : ''}`} />
              </button>

            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Currency Code / Symbol</label>
            <div className="input-with-icon">
              <Globe className="input-icon" size={18} />
              <input 
                type="text" 
                className="form-control"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="₹, $, €, £"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Established Year</label>
            <div className="input-with-icon">
              <Calendar className="input-icon" size={18} />
              <input 
                type="text" 
                className="form-control"
                value={establishedYear}
                onChange={(e) => setEstablishedYear(e.target.value)}
                placeholder="e.g. 2026"
                required
              />
            </div>
          </div>

          {/* Restaurant Cover Image */}
          <div className="form-group">
            <label className="form-label">Restaurant Cover Banner</label>
            
            <div className="cover-preview-container">
              {(coverImage || imageFile) ? (
                <div className="settings-cover-preview">
                  <img src={imageFile ? URL.createObjectURL(imageFile) : resolveImageUrl(coverImage)} alt="cover" />
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm remove-cover-btn"
                    onClick={() => {
                      setCoverImage('');
                      setImageFile(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="settings-cover-placeholder">
                  <ImageIcon size={32} />
                  <span>No cover banner image set.</span>
                </div>
              )}
            </div>

            <div className="image-uploader-box" style={{ marginTop: '12px' }}>
              <div className="file-input-wrapper">
                <Upload size={18} />
                <span>{imageFile ? imageFile.name : 'Select Banner Image (Max 5MB)'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary settings-submit-btn"
            disabled={saving || uploadingImage}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </form>
      </div>

      <style>{`
        .settings-container {
          max-width: 600px;
        }

        .settings-form-card {
          padding: 30px;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .settings-form-card h3 {
          font-size: 18px;
        }

        .card-header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .input-hint {
          font-size: 11px;
          color: var(--text-dark-muted);
          margin-top: 4px;
        }

        .cover-preview-container {
          width: 100%;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--border-dark);
          background: rgba(0, 0, 0, 0.2);
        }

        .settings-cover-preview {
          position: relative;
          height: 160px;
        }
        .settings-cover-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-cover-btn {
          position: absolute;
          bottom: 12px;
          right: 12px;
        }

        .settings-cover-placeholder {
          height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-dark-muted);
          font-size: 13px;
          gap: 8px;
        }

        .settings-submit-btn {
          width: 100%;
          padding: 12px;
          margin-top: 10px;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-with-icon .form-control {
          padding-left: 44px;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dark-muted);
        }

        /* Order Mode Selector */
        .order-mode-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .order-mode-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: var(--radius-md);
          border: 1.5px solid var(--border-dark);
          background: rgba(255,255,255,0.03);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          width: 100%;
          color: var(--text-dark-primary);
        }

        .order-mode-card:hover {
          border-color: rgba(255, 78, 0, 0.4);
          background: rgba(255, 78, 0, 0.04);
        }

        .order-mode-card.active {
          border-color: var(--primary);
          background: rgba(255, 78, 0, 0.08);
          box-shadow: 0 0 0 1px rgba(255, 78, 0, 0.2);
        }

        .mode-icon-box {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mode-icon-box.whatsapp {
          background: rgba(37, 211, 102, 0.12);
          color: #25D366;
        }

        .mode-icon-box.dashboard {
          background: rgba(99, 179, 237, 0.12);
          color: #63B3ED;
        }

        .mode-icon-box.both {
          background: rgba(255, 78, 0, 0.12);
          color: var(--primary);
        }

        .mode-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .mode-text strong {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark-primary);
        }

        .mode-text span {
          font-size: 11px;
          color: var(--text-dark-muted);
          line-height: 1.4;
        }

        .mode-radio {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--border-dark);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .mode-radio.selected {
          border-color: var(--primary);
          background: var(--primary);
          box-shadow: 0 0 0 3px rgba(255, 78, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
