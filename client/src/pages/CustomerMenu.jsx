import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ShoppingBag, 
  Search, 
  X, 
  Plus, 
  Minus, 
  Leaf, 
  Flame, 
  Phone, 
  CheckCircle,
  HelpCircle,
  Inbox,
  Sparkles
} from 'lucide-react';

export default function CustomerMenu() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table') || '';

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [nonVegOnly, setNonVegOnly] = useState(false);

  // Cart states
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(tableParam);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails] = useState(null);

  useEffect(() => {
    async function loadMenu() {
      try {
        setError('');
        const data = await api.get(`/public/menu/${slug}`);
        setRestaurant(data.profile);
        setCategories(data.categories);
        setItems(data.items);
      } catch (err) {
        setError(err.message || 'Failed to load menu. Make sure the link is correct.');
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, [slug]);

  // Sync table number query param if it changes
  useEffect(() => {
    if (tableParam) {
      setTableNumber(tableParam);
    }
  }, [tableParam]);

  // Cart operations
  const addToCart = (item) => {
    setCart(prevCart => {
      const existing = prevCart[item.id];
      return {
        ...prevCart,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
  };

  const removeFromCart = (item) => {
    setCart(prevCart => {
      const existing = prevCart[item.id];
      if (!existing) return prevCart;

      const updatedCart = { ...prevCart };
      if (existing.quantity === 1) {
        delete updatedCart[item.id];
      } else {
        updatedCart[item.id] = {
          ...existing,
          quantity: existing.quantity - 1
        };
      }
      return updatedCart;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  // Place Order Handlers
  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      alert('Please enter your table number.');
      return;
    }

    const cartItemsList = Object.values(cart);
    if (cartItemsList.length === 0) return;

    const total = getCartTotal();

    try {
      // 1. Format WhatsApp Redirect Message
      const currency = restaurant.currency || '₹';
      let message = `*NEW ORDER - ${restaurant.restaurant_name}*\n`;
      message += `*Table:* ${tableNumber}\n`;
      message += `------------------------\n`;
      cartItemsList.forEach(item => {
        message += `• ${item.quantity}x ${item.name} - ${currency}${item.price * item.quantity}\n`;
      });
      message += `------------------------\n`;
      message += `*Total Amount:* ${currency}${total}\n`;
      
      if (specialInstructions.trim()) {
        message += `\n*Note:* ${specialInstructions}\n`;
      }
      message += `\n_Placed via QR Dine Menu_`;

      const encodedText = encodeURIComponent(message);
      let cleanPhone = restaurant.phone_number;
      if (cleanPhone.length === 10 && (restaurant.currency === '₹' || !restaurant.currency)) {
        cleanPhone = '91' + cleanPhone;
      }
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

      // 2. Clear cart and set simulated success receipt view
      const simulatedOrder = {
        table_number: tableNumber,
        items: cartItemsList,
        total_price: total
      };
      setPlacedOrderDetails(simulatedOrder);
      setCart({});
      setSpecialInstructions('');
      setCartOpen(false);
      setOrderPlaced(true);

      // 3. Redirect to WhatsApp
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      alert('Order placement failed: ' + err.message);
    }
  };

  // Filters logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCatId === 'all' || item.category_id === selectedCatId;
    const matchesVeg = !vegOnly || item.is_veg;
    const matchesNonVeg = !nonVegOnly || !item.is_veg;

    return matchesSearch && matchesCategory && matchesVeg && matchesNonVeg;
  });

  if (loading) {
    return (
      <div className="menu-client-loading">
        <div className="loader"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-client-error text-center">
        <Inbox size={48} className="empty-icon" />
        <h2>Menu Unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  const currencySymbol = restaurant.currency || '₹';

  return (
    <div className="client-menu-container">
      {/* Cover Banner */}
      <div className="menu-cover-banner">
        {restaurant.cover_image ? (
          <img src={restaurant.cover_image} alt={restaurant.restaurant_name} className="cover-img" />
        ) : (
          <div className="default-cover-pattern"></div>
        )}
      </div>

      {/* Main Card Content */}
      <div className="client-menu-card glass-light">
        
        {/* Success View */}
        {orderPlaced ? (
          <div className="order-success-view animated">
            <CheckCircle className="success-icon" size={60} />
            <h2>Order Sent Successfully!</h2>
            <p>Your order has been received by our staff and redirected to WhatsApp for verification.</p>
            
            <div className="receipt-box">
              <h4>Order Details</h4>
              <div className="receipt-meta">
                <span>Table: <strong>{tableNumber}</strong></span>
                <span>Status: <strong className="text-warning">Pending</strong></span>
              </div>
              <div className="receipt-items">
                {placedOrderDetails?.items?.map((item, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{currencySymbol}{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="receipt-total-row">
                <span>Total Paid</span>
                <span>{currencySymbol}{placedOrderDetails?.total_price}</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setOrderPlaced(false)}>
              Order More Items
            </button>
          </div>
        ) : (
          <>
            {/* Menu Header */}
            <div className="menu-profile-header">
              <div className="menu-profile-title">
                <h1>{restaurant.restaurant_name}</h1>
                <div className="header-badges">
                  {tableNumber && <span className="badge badge-info">Table {tableNumber}</span>}
                  <span className="badge badge-success">Open Menu</span>
                </div>
              </div>
              <button className="cart-header-icon-btn" onClick={() => setCartOpen(true)} title="View Cart">
                <ShoppingBag size={22} />
                {getCartCount() > 0 && <span className="cart-header-badge">{getCartCount()}</span>}
              </button>
            </div>

            {/* Search and Filters */}
            <div className="search-filter-sticky">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search dishes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <X size={16} className="clear-icon" onClick={() => setSearchQuery('')} />
                )}
              </div>

              {/* Veg Toggle Row */}
              <div className="veg-toggles-row">
                <button 
                  className={`veg-filter-btn veg ${vegOnly ? 'active' : ''}`}
                  onClick={() => { setVegOnly(!vegOnly); setNonVegOnly(false); }}
                >
                  <Leaf size={14} />
                  <span>Veg Only</span>
                </button>
                <button 
                  className={`veg-filter-btn nonveg ${nonVegOnly ? 'active' : ''}`}
                  onClick={() => { setNonVegOnly(!nonVegOnly); setVegOnly(false); }}
                >
                  <Flame size={14} />
                  <span>Non-Veg Only</span>
                </button>
              </div>

              {/* Categories Scrollbar */}
              <div className="horizontal-categories">
                <button 
                  className={`cat-pill ${selectedCatId === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCatId('all')}
                >
                  All
                </button>
                {categories.map(c => (
                  <button 
                    key={c.id}
                    className={`cat-pill ${selectedCatId === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedCatId(c.id)}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="client-menu-items">
              {filteredItems.length === 0 ? (
                <div className="empty-menu-state">
                  <Inbox size={32} />
                  <p>No matching dishes found.</p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const cartItem = cart[item.id];
                  return (
                    <div key={item.id} className="client-dish-row animated">
                      <div className="dish-details">
                        <div className="dish-title-row">
                          {item.is_veg ? (
                            <Leaf className="veg-icon" size={14} />
                          ) : (
                            <Flame className="nonveg-icon" size={14} />
                          )}
                          <h3>{item.name}</h3>
                        </div>
                        <p className="dish-desc">{item.description}</p>
                        <span className="dish-price">{currencySymbol}{item.price}</span>
                      </div>

                      <div className="dish-action-area">
                        {item.image_url && (
                          <div className="dish-thumbnail">
                            <img src={item.image_url} alt={item.name} />
                          </div>
                        )}

                        <div className="qty-action-control">
                          {cartItem ? (
                            <div className="qty-counter">
                              <button onClick={() => removeFromCart(item)}><Minus size={14} /></button>
                              <span>{cartItem.quantity}</span>
                              <button onClick={() => addToCart(item)}><Plus size={14} /></button>
                            </div>
                          ) : (
                            <button className="add-to-cart-btn" onClick={() => addToCart(item)}>
                              <span>ADD</span>
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating View Cart bar */}
      {getCartCount() > 0 && !cartOpen && !orderPlaced && (
        <div className="floating-cart-bar animated" onClick={() => setCartOpen(true)}>
          <div className="cart-bar-info">
            <span className="qty-badge">{getCartCount()} items</span>
            <span className="divider">|</span>
            <span className="total">{currencySymbol}{getCartTotal()}</span>
          </div>
          <div className="cart-bar-action">
            <span>View Cart</span>
            <ShoppingBag size={18} />
          </div>
        </div>
      )}

      {/* Cart Sliding Drawer overlay */}
      {cartOpen && (
        <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-drawer animated" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Your Order Cart</h3>
              <button onClick={() => setCartOpen(false)}><X size={20} /></button>
            </div>

            <div className="drawer-body">
              {/* Table setup if not present */}
              <div className="form-group drawer-table-group">
                <label className="form-label">Table Number</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Enter Table Number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                />
              </div>

              {/* Items List */}
              <div className="drawer-items-list">
                {Object.values(cart).map(item => (
                  <div key={item.id} className="drawer-item-row">
                    <div className="drawer-item-info">
                      <h5>{item.name}</h5>
                      <span>{currencySymbol}{item.price}</span>
                    </div>

                    <div className="qty-counter drawer-qty">
                      <button onClick={() => removeFromCart(item)}><Minus size={12} /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => addToCart(item)}><Plus size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Cooking Instructions</label>
                <textarea 
                  className="form-control"
                  rows="2"
                  placeholder="e.g. No spicy, extra cheese, etc."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* Price summary */}
              <div className="drawer-price-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{getCartTotal()}</span>
                </div>
                <div className="summary-row grand-total">
                  <span>Grand Total</span>
                  <span>{currencySymbol}{getCartTotal()}</span>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-primary place-order-btn" onClick={handlePlaceOrder}>
                <ShoppingBag size={18} />
                <span>Place Order via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for customer mobile look */}
      <style>{`
        /* Setup the customer theme */
        .client-menu-container {
          background-color: var(--bg-light);
          min-height: 100vh;
          font-family: var(--font-sans);
          color: var(--text-light-primary);
          padding-bottom: 90px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .menu-cover-banner {
          width: 100%;
          height: 180px;
          position: relative;
          background: #eee;
        }
        .cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .default-cover-pattern {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #fce38a 0%, #f38181 100%);
        }

        .client-menu-card {
          width: 100%;
          max-width: 600px;
          margin-top: -30px;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          padding: 24px 20px;
          box-shadow: var(--shadow-lg);
          background: #ffffff;
          border: none;
          z-index: 10;
          position: relative;
          flex-grow: 1;
        }

        /* Loading */
        .menu-client-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: var(--bg-light);
        }

        .menu-client-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: var(--bg-light);
          color: var(--text-light-secondary);
          padding: 40px 20px;
        }
        .empty-icon {
          color: var(--text-light-muted);
          margin-bottom: 16px;
        }
        .menu-client-error h2 {
          font-size: 20px;
          color: var(--text-light-primary);
        }

        /* Profile Header */
        .menu-profile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 16px;
        }
        .menu-profile-header h1 {
          font-size: 26px;
          color: var(--text-light-primary);
          line-height: 1.2;
        }
        .header-badges {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }
        .cart-header-icon-btn {
          position: relative;
          background: #f8f9fa;
          border: 1px solid var(--border-light);
          color: var(--text-light-primary);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-sm);
          flex-shrink: 0;
          outline: none;
        }
        .cart-header-icon-btn:hover {
          background: #f2f4f7;
          border-color: #cbd5e1;
        }
        .cart-header-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--gradient-brand);
          color: white;
          font-size: 10px;
          font-weight: 700;
          min-width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          border: 2px solid #ffffff;
        }

        /* Sticky Search Filter */
        .search-filter-sticky {
          position: sticky;
          top: 0;
          background: #ffffff;
          padding: 8px 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #f2f4f7;
          border-radius: var(--radius-md);
          padding: 10px 14px;
          gap: 10px;
        }
        .search-box input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          color: var(--text-light-primary);
          font-size: 14px;
        }
        .search-icon, .clear-icon {
          color: var(--text-light-secondary);
        }
        .clear-icon {
          cursor: pointer;
        }

        .veg-toggles-row {
          display: flex;
          gap: 10px;
        }
        .veg-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-light);
          background: none;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-light-secondary);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .veg-filter-btn.veg.active {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
          border-color: #28a745;
        }
        .veg-filter-btn.nonveg.active {
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          border-color: #dc3545;
        }

        /* Scroll Category Pills */
        .horizontal-categories {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 4px 0;
          white-space: nowrap;
          scrollbar-width: none;
        }
        .horizontal-categories::-webkit-scrollbar {
          display: none;
        }

        .cat-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-light);
          background: #f8f9fa;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-light-secondary);
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .cat-pill.active {
          background: var(--gradient-brand);
          color: white;
          border-color: transparent;
        }

        /* Items List */
        .client-menu-items {
          display: flex;
          flex-direction: column;
        }

        .empty-menu-state {
          padding: 40px;
          text-align: center;
          color: var(--text-light-muted);
        }

        .client-dish-row {
          display: flex;
          justify-content: space-between;
          padding: 20px 0;
          border-bottom: 1px solid var(--border-light);
          gap: 16px;
        }

        .dish-details {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dish-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dish-title-row h3 {
          font-size: 16px;
          color: var(--text-light-primary);
          font-weight: 700;
        }
        .veg-icon { color: #28a745; }
        .nonveg-icon { color: #dc3545; }

        .dish-desc {
          font-size: 13px;
          color: var(--text-light-secondary);
          line-height: 1.4;
        }

        .dish-price {
          font-size: 15px;
          font-weight: 800;
          color: var(--primary);
        }

        .dish-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          min-width: 100px;
        }

        .dish-thumbnail {
          width: 90px;
          height: 80px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: #eee;
        }
        .dish-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* Add to Cart controller */
        .add-to-cart-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--primary);
          background: #fff;
          color: var(--primary);
          padding: 6px 16px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: var(--transition-fast);
          box-shadow: var(--shadow-sm);
        }
        .add-to-cart-btn:hover {
          background: var(--primary-glow);
        }

        .qty-counter {
          display: flex;
          align-items: center;
          border: 1px solid var(--primary);
          background: var(--primary);
          color: white;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .qty-counter button {
          border: none;
          background: none;
          color: white;
          padding: 6px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qty-counter button:hover {
          background: rgba(0,0,0,0.1);
        }
        .qty-counter span {
          padding: 0 8px;
          font-size: 13px;
          font-weight: 700;
          min-width: 20px;
          text-align: center;
        }

        /* Floating Cart Bar */
        .floating-cart-bar {
          position: fixed;
          bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 40px);
          max-width: 560px;
          background: var(--gradient-brand);
          color: white;
          border-radius: var(--radius-md);
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: var(--shadow-lg);
          z-index: 999;
          cursor: pointer;
        }

        .cart-bar-info {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
        }
        .cart-bar-action {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
        }

        /* Drawer CSS */
        .cart-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1000;
          display: flex;
          justify-content: center;
        }

        .cart-drawer {
          position: fixed;
          bottom: 0;
          width: 100%;
          max-width: 600px;
          background: #ffffff;
          border-top-left-radius: var(--radius-lg);
          border-top-right-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          max-height: 85vh;
          z-index: 1010;
          animation: slideUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border-light);
        }
        .drawer-header button {
          border: none;
          background: none;
          cursor: pointer;
          color: var(--text-light-secondary);
        }

        .drawer-body {
          padding: 20px;
          overflow-y: auto;
          flex-grow: 1;
        }

        .drawer-table-group .form-control {
          background: #f8f9fa;
          border: 1px solid var(--border-light);
          color: var(--text-light-primary);
        }
        .drawer-table-group .form-control:focus {
          background: #fff;
          border-color: var(--primary);
        }

        .drawer-items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }

        .drawer-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 12px;
        }
        .drawer-item-info h5 {
          font-size: 14px;
          color: var(--text-light-primary);
        }
        .drawer-item-info span {
          font-size: 12px;
          color: var(--primary);
          font-weight: 700;
        }

        .drawer-qty {
          transform: scale(0.9);
        }

        .drawer-price-summary {
          margin-top: 24px;
          border-top: 1px solid var(--border-light);
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: var(--text-light-secondary);
        }
        .grand-total {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-light-primary);
          border-top: 1px dashed var(--border-light);
          padding-top: 8px;
        }

        .drawer-footer {
          padding: 20px;
          border-top: 1px solid var(--border-light);
        }
        .place-order-btn {
          width: 100%;
          padding: 14px;
          font-size: 15px;
        }

        /* Success View Receipt styling */
        .order-success-view {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          padding: 20px 10px;
        }
        .success-icon {
          color: var(--success);
        }
        .order-success-view h2 {
          font-size: 22px;
        }
        .order-success-view p {
          font-size: 14px;
          color: var(--text-light-secondary);
          max-width: 380px;
        }

        .receipt-box {
          background: #f8f9fa;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          padding: 20px;
          width: 100%;
          text-align: left;
          font-size: 13px;
        }
        .receipt-box h4 {
          font-size: 15px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 6px;
        }
        .receipt-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .receipt-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-bottom: 1px dashed var(--border-light);
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .receipt-item-row {
          display: flex;
          justify-content: space-between;
          color: var(--text-light-secondary);
        }
        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          font-weight: 800;
          font-size: 15px;
          color: var(--text-light-primary);
        }
      `}</style>
    </div>
  );
}
