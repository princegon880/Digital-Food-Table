import { useState, useEffect } from 'react';
import { api, resolveImageUrl } from '../../utils/api';
import Modal from '../../components/Modal';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  Upload, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Flame,
  Leaf
} from 'lucide-react';

export default function MenuManager() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal control states
  const [categoryModal, setCategoryModal] = useState({ open: false, mode: 'create', data: null });
  const [itemModal, setItemModal] = useState({ open: false, mode: 'create', data: null });

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '🍽️', order: 0 });
  const [itemForm, setItemForm] = useState({
    name: '',
    price: '',
    description: '',
    categoryId: '',
    imageUrl: '',
    isVeg: true,
    isAvailable: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const profile = JSON.parse(localStorage.getItem('profile') || '{}');

  const fetchData = async () => {
    try {
      setError('');
      const [catsData, itemsData] = await Promise.all([
        api.get('/categories'),
        api.get('/items')
      ]);
      setCategories(catsData);
      setItems(itemsData);
      
      if (catsData.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(catsData[0].id);
      }
    } catch (err) {
      setError('Failed to fetch menu data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CATEGORY OPERATIONS
  const openCategoryModal = (mode, data = null) => {
    if (mode === 'create') {
      setCategoryForm({ name: '', icon: '🍽️', order: categories.length });
    } else {
      setCategoryForm({ name: data.name, icon: data.icon, order: data.order });
    }
    setCategoryModal({ open: true, mode, data });
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (categoryModal.mode === 'create') {
        const newCat = await api.post('/categories', categoryForm);
        setCategories([...categories, newCat]);
        if (!selectedCategoryId) setSelectedCategoryId(newCat.id);
      } else {
        const updatedCat = await api.put(`/categories/${categoryModal.data.id}`, categoryForm);
        setCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
      }
      setCategoryModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      alert('Error saving category: ' + err.message);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm('Deleting this category will delete all items inside it! Are you sure?')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      setItems(items.filter(i => i.category_id !== id));
      if (selectedCategoryId === id) {
        const remaining = categories.filter(c => c.id !== id);
        setSelectedCategoryId(remaining.length > 0 ? remaining[0].id : '');
      }
    } catch (err) {
      alert('Error deleting category: ' + err.message);
    }
  };

  // ITEM OPERATIONS
  const openItemModal = (mode, data = null) => {
    setImageFile(null);
    if (mode === 'create') {
      setItemForm({
        name: '',
        price: '',
        description: '',
        categoryId: selectedCategoryId || (categories[0]?.id || ''),
        imageUrl: '',
        isVeg: true,
        isAvailable: true
      });
    } else {
      setItemForm({
        name: data.name,
        price: data.price,
        description: data.description,
        categoryId: data.category_id,
        imageUrl: data.image_url,
        isVeg: data.is_veg,
        isAvailable: data.is_available
      });
    }
    setItemModal({ open: true, mode, data });
  };

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
      alert('Image upload failed: ' + err.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalImageUrl = itemForm.imageUrl;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const submission = {
        ...itemForm,
        imageUrl: finalImageUrl,
        price: Math.round(parseFloat(itemForm.price) * 100) / 100
      };

      if (itemModal.mode === 'create') {
        await api.post('/items', submission);
        // Refresh items list
        fetchData();
      } else {
        await api.put(`/items/${itemModal.data.id}`, submission);
        // Refresh items list
        fetchData();
      }
      setItemModal({ open: false, mode: 'create', data: null });
    } catch (err) {
      alert('Error saving menu item: ' + err.message);
    }
  };

  const handleToggleAvailable = async (item) => {
    try {
      const updated = await api.put(`/items/${item.id}`, {
        isAvailable: !item.is_available
      });
      setItems(items.map(i => i.id === item.id ? { ...i, is_available: updated.is_available } : i));
    } catch {
      alert('Failed to update availability');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;
    try {
      await api.delete(`/items/${id}`);
      setItems(items.filter(i => i.id !== id));
    } catch (err) {
      alert('Error deleting menu item: ' + err.message);
    }
  };

  const filteredItems = items.filter(item => item.category_id === selectedCategoryId);
  const activeCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <div className="menu-manager-wrapper animated">
      <div className="dash-header">
        <div>
          <h2>Menu Builder</h2>
          <p>Organize your restaurant menu categories and individual food dishes.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => openCategoryModal('create')}>
            <Plus size={16} />
            <span>Add Category</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => openItemModal('create')}
            disabled={categories.length === 0}
          >
            <Plus size={16} />
            <span>Add New Dish</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="auth-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="builder-layout">
          {/* Categories Sidebar */}
          <div className="glass categories-sidebar">
            <div className="sidebar-header">
              <h4>Categories</h4>
            </div>
            
            {categories.length === 0 ? (
              <div className="empty-sidebar">
                <p>No categories created. Click "Add Category" above to begin.</p>
              </div>
            ) : (
              <div className="categories-list">
                {categories.map((cat) => (
                  <div 
                    key={cat.id} 
                    className={`category-item-row ${selectedCategoryId === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-name">{cat.name}</span>
                    <div className="cat-actions">
                      <button 
                        className="cat-action-btn edit" 
                        onClick={(e) => { e.stopPropagation(); openCategoryModal('edit', cat); }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        className="cat-action-btn delete" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Items Content Area */}
          <div className="items-content-area">
            {categories.length === 0 ? (
              <div className="glass empty-items-state">
                <p>Create a category first to add menu items.</p>
              </div>
            ) : (
              <>
                <div className="category-header-info">
                  <h3>
                    <span>{activeCategory?.icon}</span>
                    <span>{activeCategory?.name} Dishes</span>
                    <span className="count-badge">{filteredItems.length} items</span>
                  </h3>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="glass empty-items-state">
                    <Plus size={32} className="plus-icon-huge" onClick={() => openItemModal('create')} />
                    <h4>No items in this category yet</h4>
                    <p>Click below or use the "Add New Dish" button to create your first item.</p>
                    <button className="btn btn-primary btn-sm" onClick={() => openItemModal('create')}>
                      Add Your First Dish
                    </button>
                  </div>
                ) : (
                  <div className="dishes-grid">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="glass dish-card">
                        <div className="dish-image-wrapper">
                          {item.image_url ? (
                            <img src={resolveImageUrl(item.image_url)} alt={item.name} className="dish-img" />
                          ) : (
                            <div className="dish-img-placeholder">
                              <ImageIcon size={32} />
                            </div>
                          )}
                          <div className="dish-type-tag">
                            {item.is_veg ? (
                              <span className="veg-badge"><Leaf size={12} /> Veg</span>
                            ) : (
                              <span className="non-veg-badge"><Flame size={12} /> Non-Veg</span>
                            )}
                          </div>
                        </div>

                        <div className="dish-info">
                          <div className="dish-title-row">
                            <h4>{item.name}</h4>
                            <span className="dish-price">{profile.currency || '₹'}{item.price}</span>
                          </div>
                          
                          <p className="dish-desc">{item.description || 'No description provided.'}</p>
                          
                          <div className="dish-footer">
                            <div className="status-toggle" onClick={() => handleToggleAvailable(item)}>
                              <span>In Stock</span>
                              {item.is_available ? (
                                <ToggleRight className="toggle-icon checked" size={24} />
                              ) : (
                                <ToggleLeft className="toggle-icon" size={24} />
                              )}
                            </div>

                            <div className="dish-actions">
                              <button 
                                className="dish-action-btn edit"
                                onClick={() => openItemModal('edit', item)}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                className="dish-action-btn delete"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Category Creation/Edit Modal */}
      <Modal 
        isOpen={categoryModal.open} 
        onClose={() => setCategoryModal({ open: false, mode: 'create', data: null })}
        title={categoryModal.mode === 'create' ? 'Create Category' : 'Edit Category'}
      >
        <form onSubmit={handleCategorySubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Category Name</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. Starters, Desserts, Pizza"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Icon / Emoji</label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. 🍔, 🍕, 🥗"
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Display Order</label>
            <input 
              type="number" 
              className="form-control"
              value={categoryForm.order}
              onChange={(e) => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
              onWheel={(e) => e.target.blur()}
            />
          </div>

          <button type="submit" className="btn btn-primary submit-modal-btn">
            {categoryModal.mode === 'create' ? 'Create' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      {/* Menu Item Creation/Edit Modal */}
      <Modal
        isOpen={itemModal.open}
        onClose={() => setItemModal({ open: false, mode: 'create', data: null })}
        title={itemModal.mode === 'create' ? 'Add Menu Dish' : 'Edit Menu Dish'}
      >
        <form onSubmit={handleItemSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Dish Name</label>
            <input 
              type="text"
              className="form-control"
              placeholder="e.g. Margherita Pizza"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row-double">
            <div className="form-group">
              <label className="form-label">Price ({profile.currency || '₹'})</label>
              <input 
                type="number"
                step="1"
                min="0"
                className="form-control"
                placeholder="250"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                onWheel={(e) => e.target.blur()}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Category</label>
              <select 
                className="form-control"
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                required
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-control"
              rows="3"
              placeholder="Brief description of ingredients or size"
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Dish Image</label>
            <div className="image-uploader-box">
              {(itemForm.imageUrl || imageFile) && (
                <div className="uploader-preview">
                  <img src={imageFile ? URL.createObjectURL(imageFile) : resolveImageUrl(itemForm.imageUrl)} alt="preview" />
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm delete-img-btn"
                    onClick={() => {
                      setItemForm({ ...itemForm, imageUrl: '' });
                      setImageFile(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}

              {(!itemForm.imageUrl && !imageFile) && (
                <div className="file-input-wrapper">
                  <Upload size={18} />
                  <span>Choose File (Max 5MB)</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-row-double switches-row">
            <div className="form-group row-group">
              <span className="form-label">Vegetarian</span>
              <div className="switch-wrapper">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={itemForm.isVeg}
                    onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="form-group row-group">
              <span className="form-label">In Stock</span>
              <div className="switch-wrapper">
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={itemForm.isAvailable}
                    onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary submit-modal-btn"
            disabled={uploadingImage}
          >
            {uploadingImage ? 'Uploading Image...' : itemModal.mode === 'create' ? 'Add Dish' : 'Save Changes'}
          </button>
        </form>
      </Modal>

      <style>{`
        .builder-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 28px;
          align-items: start;
        }

        @media (max-width: 992px) {
          .builder-layout {
            grid-template-columns: 1fr;
          }
        }

        .categories-sidebar {
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--bg-card-dark-trans);
        }

        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-dark);
        }

        .empty-sidebar {
          padding: 30px 20px;
          text-align: center;
          color: var(--text-dark-muted);
          font-size: 13px;
        }

        .categories-list {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .category-item-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: var(--transition-fast);
          position: relative;
        }

        .category-item-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .category-item-row.active {
          background: var(--primary-glow);
          color: var(--primary);
          font-weight: 600;
          border: 1px solid rgba(var(--primary-hue), 95%, 52%, 0.1);
        }

        .cat-icon {
          font-size: 18px;
        }

        .cat-name {
          flex-grow: 1;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .cat-actions {
          display: flex;
          gap: 6px;
          opacity: 0;
          transition: var(--transition-fast);
        }
        .category-item-row:hover .cat-actions, 
        .category-item-row.active .cat-actions {
          opacity: 1;
        }

        .cat-action-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          color: var(--text-dark-secondary);
          width: 24px;
          height: 24px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }
        .cat-action-btn.edit:hover {
          background: var(--primary-glow);
          color: var(--primary);
        }
        .cat-action-btn.delete:hover {
          background: rgba(255, 70, 70, 0.1);
          color: var(--danger);
        }

        /* Items Content Area */
        .items-content-area {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .category-header-info {
          border-bottom: 1px solid var(--border-dark);
          padding-bottom: 14px;
          margin-bottom: 4px;
        }

        .category-header-info h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 22px;
        }
        .count-badge {
          font-size: 12px;
          background: var(--border-dark);
          color: var(--text-dark-secondary);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-weight: normal;
        }

        .empty-items-state {
          padding: 60px 40px;
          text-align: center;
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .plus-icon-huge {
          width: 64px;
          height: 64px;
          padding: 16px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-dark);
          color: var(--text-dark-muted);
          cursor: pointer;
          transition: var(--transition);
        }
        .plus-icon-huge:hover {
          color: var(--primary);
          border-color: var(--primary);
          background: var(--primary-glow);
        }
        .empty-items-state h4 {
          font-size: 18px;
        }
        .empty-items-state p {
          color: var(--text-dark-muted);
          font-size: 14px;
          max-width: 320px;
          margin-bottom: 8px;
        }

        /* Dishes Grid */
        .dishes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .dish-card {
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: var(--transition);
          display: flex;
          flex-direction: column;
        }
        .dish-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: var(--shadow-md);
        }

        .dish-image-wrapper {
          height: 180px;
          width: 100%;
          position: relative;
          background: rgba(255, 255, 255, 0.01);
          border-bottom: 1px solid var(--border-dark);
        }

        .dish-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dish-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dark-muted);
        }

        .dish-type-tag {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 5;
        }
        .veg-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(40, 167, 69, 0.9);
          backdrop-filter: blur(4px);
          color: white;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }
        .non-veg-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(220, 53, 69, 0.9);
          backdrop-filter: blur(4px);
          color: white;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
        }

        .dish-info {
          padding: 20px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 10px;
        }

        .dish-title-row {
          display: flex;
          justify-content: space-between;
          align-items: start;
          gap: 12px;
        }
        .dish-title-row h4 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-dark-primary);
        }
        .dish-price {
          font-weight: 800;
          color: var(--primary);
          font-size: 16px;
        }

        .dish-desc {
          font-size: 13px;
          color: var(--text-dark-muted);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex-grow: 1;
        }

        .dish-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-dark);
          padding-top: 14px;
          margin-top: 6px;
        }

        .status-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dark-secondary);
        }
        .status-toggle .toggle-icon {
          color: var(--text-dark-muted);
        }
        .status-toggle .toggle-icon.checked {
          color: var(--success);
        }

        .dish-actions {
          display: flex;
          gap: 8px;
        }
        .dish-action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-dark);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-dark-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .dish-action-btn.edit:hover {
          background: var(--primary-glow);
          color: var(--primary);
          border-color: var(--primary);
        }
        .dish-action-btn.delete:hover {
          background: rgba(255, 70, 70, 0.1);
          color: var(--danger);
          border-color: rgba(255, 70, 70, 0.2);
        }

        /* Modal Forms styling */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-row-double {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .switches-row {
          border-top: 1px solid var(--border-dark);
          border-bottom: 1px solid var(--border-dark);
          padding: 16px 0;
          margin: 4px 0;
        }
        .row-group {
          flex-direction: row !important;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0;
        }

        .submit-modal-btn {
          width: 100%;
          padding: 12px;
          margin-top: 10px;
        }

      `}</style>
    </div>
  );
}
