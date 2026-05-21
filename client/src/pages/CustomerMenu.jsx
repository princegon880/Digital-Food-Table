import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../utils/api';
import { 
  ShoppingBag, 
  Search, 
  X, 
  Plus, 
  Minus, 
  Flame, 
  CheckCircle,
  Inbox,
  Sparkles,
  Star,
  ArrowRight,
  ChevronRight
} from 'lucide-react';


const CATEGORY_IMAGES = {
  pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
  pasta: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
  drinks: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
  beverages: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
  dessert: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  desserts: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  starter: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=80',
  starters: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=600&auto=format&fit=crop&q=80',
  sides: 'https://images.unsplash.com/photo-1534080391025-09795d1933e0?w=600&auto=format&fit=crop&q=80',
  default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80'
};

const getDishImage = (item, categoriesList) => {
  if (item.image_url && item.image_url.trim() !== '') {
    return item.image_url;
  }
  
  const cat = categoriesList.find(c => c.id === item.category_id);
  const catName = cat ? cat.name.toLowerCase() : '';
  const itemName = item.name.toLowerCase();
  
  if (catName.includes('pizza') || itemName.includes('pizza')) {
    return CATEGORY_IMAGES.pizza;
  }
  if (catName.includes('burger') || itemName.includes('burger')) {
    return CATEGORY_IMAGES.burger;
  }
  if (catName.includes('pasta') || itemName.includes('pasta') || catName.includes('noodle') || itemName.includes('noodle')) {
    return CATEGORY_IMAGES.pasta;
  }
  if (catName.includes('drink') || itemName.includes('drink') || catName.includes('beverage') || itemName.includes('beverage') || itemName.includes('mojito') || itemName.includes('shake') || itemName.includes('coffee') || itemName.includes('tea')) {
    return CATEGORY_IMAGES.drinks;
  }
  if (catName.includes('dessert') || itemName.includes('dessert') || catName.includes('sweet') || itemName.includes('sweet') || itemName.includes('cake') || itemName.includes('waffle') || itemName.includes('brownie') || itemName.includes('ice cream')) {
    return CATEGORY_IMAGES.desserts;
  }
  if (catName.includes('starter') || itemName.includes('starter') || catName.includes('appetizer') || itemName.includes('appetizer') || itemName.includes('wings') || itemName.includes('fries') || itemName.includes('garlic bread')) {
    return CATEGORY_IMAGES.starters;
  }
  return CATEGORY_IMAGES.default;
};

const getSpiceLevel = (item) => {
  const text = `${item.name} ${item.description || ''}`.toLowerCase();
  if (text.includes('extra spicy') || text.includes('fire') || text.includes('ghost pepper') || text.includes('devil') || text.includes('insane')) {
    return 3;
  }
  if (text.includes('spicy') || text.includes('chili') || text.includes('hot') || text.includes('schezwan') || text.includes('peri') || text.includes('jalapeno') || text.includes('chilli')) {
    return 2;
  }
  if (text.includes('mild') || text.includes('pepper') || text.includes('cajun') || text.includes('spiced')) {
    return 1;
  }
  return 0;
};

export default function CustomerMenu() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableParam = searchParams.get('table') || '';
  const menuCatalogRef = useRef(null);

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

  useEffect(() => {
    if (restaurant && restaurant.restaurant_name) {
      document.title = `${restaurant.restaurant_name} | Digital Menu`;
    } else {
      document.title = 'Digital Menu';
    }
  }, [restaurant]);

  // Sync table number query param if it changes
  const [prevTableParam, setPrevTableParam] = useState(tableParam);
  if (tableParam !== prevTableParam) {
    setPrevTableParam(tableParam);
    setTableNumber(tableParam);
  }

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
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCatId === 'all' || item.category_id === selectedCatId;
    const matchesVeg = !vegOnly || item.is_veg;
    const matchesNonVeg = !nonVegOnly || !item.is_veg;

    return matchesSearch && matchesCategory && matchesVeg && matchesNonVeg;
  });

  if (loading) {
    const loadingName = slug 
      ? slug.split('-').join(' ').toUpperCase()
      : 'LOADING...';
    return (
      <div className="menu-client-loading">
        <div className="luxury-loader"></div>
        <h2 className="loading-brand animate-pulse">{loadingName}</h2>
        <p className="loading-sub">Preparing fresh ingredients...</p>
        <style>{`
          .menu-client-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #09090b;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            gap: 12px;
          }
          .luxury-loader {
            position: relative;
            width: 50px;
            height: 50px;
            margin-bottom: 8px;
          }
          .luxury-loader::before, .luxury-loader::after {
            content: '';
            position: absolute;
            border-radius: 50%;
            border: 3px solid transparent;
          }
          .luxury-loader::before {
            top: 0; left: 0; right: 0; bottom: 0;
            border-top-color: #FF5E00;
            animation: spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
          }
          .luxury-loader::after {
            top: 8px; left: 8px; right: 8px; bottom: 8px;
            border-bottom-color: #FFB300;
            animation: spinReverse 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes spinReverse {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
          }
          .loading-brand {
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 0.2em;
            color: #ffffff;
          }
          .loading-sub {
            font-size: 13px;
            color: #71717a;
            letter-spacing: 0.05em;
          }
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.toLowerCase().includes('not found') || error.toLowerCase().includes('required');
    return (
      <div className="menu-client-error text-center">
        <Inbox size={48} className="empty-icon" />
        <h2>{isNotFound ? 'Restaurant Not Found' : 'Menu Temporarily Unavailable'}</h2>
        <p>{isNotFound ? "We couldn't find the restaurant you are looking for. Please scan the QR code or verify the URL and try again." : error}</p>
        <Link to="/" className="btn-primary error-home-btn">
          Back to Home
        </Link>
        <style>{`
          .menu-client-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #09090b;
            color: #a0a0ab;
            padding: 40px 24px;
            font-family: 'Outfit', sans-serif;
            text-align: center;
          }
          .empty-icon {
            color: #ef4444;
            margin-bottom: 20px;
            opacity: 0.8;
          }
          .menu-client-error h2 {
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
          }
          .menu-client-error p {
            font-size: 14px;
            color: #71717a;
            max-width: 320px;
            line-height: 1.5;
            margin-bottom: 24px;
          }
          .error-home-btn {
            background: var(--gradient-brand, linear-gradient(90deg, #ff4e00 0%, #ec008c 100%));
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            text-decoration: none;
            border: none;
            box-shadow: 0 4px 14px rgba(255, 78, 0, 0.3);
            transition: all 0.2s ease;
          }
          .error-home-btn:hover {
            transform: translateY(-2px);
            opacity: 0.9;
          }
        `}</style>
      </div>
    );
  }

  const currencySymbol = restaurant.currency || '₹';
  const popularItems = items.filter(item => item.is_available).slice(0, 5);

  const scrollToCatalog = () => {
    if (menuCatalogRef.current) {
      menuCatalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="client-menu-container">
      {/* 1. Brand Hero Header */}
      <div className="como-hero-banner">
        <div className="como-hero-overlay"></div>
        <img 
          src={restaurant.cover_image && restaurant.cover_image.trim() !== '' ? restaurant.cover_image : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'} 
          alt={restaurant.restaurant_name} 
          className="como-hero-img" 
        />
        
        <div className="como-hero-content">
          <div className="como-logo-badge">
            <Sparkles size={16} className="text-warning" />
            <span>EST. {restaurant.established_year || '2026'}</span>
          </div>
          <h1 className="como-brand-title">{restaurant.restaurant_name}</h1>
          <p className="como-brand-tagline">Premium Dining Experience</p>
          
          <div className="como-hero-badges-row">
            <span className="como-badge green">🟢 Dine-In Open</span>
            {tableNumber && <span className="como-badge table-tag">📍 Table {tableNumber}</span>}
          </div>

          <button className="como-hero-cta" onClick={scrollToCatalog}>
            <span>Order Now</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="como-main-content">
        
        {/* Success / Receipt View */}
        {orderPlaced ? (
          <div className="como-success-card animated">
            <div className="success-icon-ring">
              <CheckCircle className="success-icon" size={32} />
            </div>
            <h2>Order Sent to Kitchen!</h2>
            <p className="success-desc">We have received your order. We've redirecting you to WhatsApp to confirm details.</p>
            
            <div className="como-receipt-box">
              <div className="receipt-header">
                <h4>DIGITAL RECEIPT</h4>
                <span className="receipt-status-badge">PENDING CONFIRMATION</span>
              </div>
              <div className="receipt-meta-grid">
                <div>
                  <span className="label">Table</span>
                  <span className="value">#{tableNumber}</span>
                </div>
                <div>
                  <span className="label">Date</span>
                  <span className="value">Today</span>
                </div>
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-items-list">
                {placedOrderDetails?.items?.map((item, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <span className="item-name">{item.quantity}x {item.name}</span>
                    <span className="item-price">{currencySymbol}{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="receipt-divider"></div>
              <div className="receipt-total-row">
                <span>Grand Total</span>
                <span className="total-val">{currencySymbol}{placedOrderDetails?.total_price}</span>
              </div>
            </div>

            <button className="btn-primary como-order-more-btn" onClick={() => setOrderPlaced(false)}>
              Order More Dishes
            </button>
          </div>
        ) : (
          <>
            {/* 2. Chef's Recommendations Carousel */}
            {popularItems.length > 0 && (
              <div className="como-popular-section">
                <div className="section-header">
                  <div className="title-row">
                    <Star className="text-warning-gold" size={18} fill="#FFB300" />
                    <h2>Chef's Specials</h2>
                  </div>
                  <span className="sub-label">Popular choices</span>
                </div>
                
                <div className="como-popular-carousel">
                  {popularItems.map(item => {
                    const cartItem = cart[item.id];
                    const dishImg = getDishImage(item, categories);
                    return (
                      <div key={item.id} className="como-popular-card">
                        <div className="card-image-box">
                          <img src={dishImg} alt={item.name} />
                          <div className="card-badge">Must Try</div>
                          {item.is_veg ? (
                            <div className="diet-tag veg-circle"><div className="green-dot"></div></div>
                          ) : (
                            <div className="diet-tag nonveg-circle"><div className="red-dot"></div></div>
                          )}
                        </div>
                        <div className="card-info">
                          <h3>{item.name}</h3>
                          <p className="item-desc-short">{item.description}</p>
                          <div className="card-footer-row">
                            <span className="card-price">{currencySymbol}{item.price}</span>
                            
                            <div className="carousel-qty-control">
                              {cartItem ? (
                                <div className="qty-counter mini">
                                  <button onClick={() => removeFromCart(item)}><Minus size={10} /></button>
                                  <span>{cartItem.quantity}</span>
                                  <button onClick={() => addToCart(item)}><Plus size={10} /></button>
                                </div>
                              ) : (
                                <button className="como-mini-add-btn" onClick={() => addToCart(item)}>
                                  <span>ADD</span>
                                  <Plus size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Catalog Section */}
            <div className="como-menu-catalog" ref={menuCatalogRef}>
              
              {/* Sticky Search bar and Filters */}
              <div className="como-sticky-header">
                <div className="como-search-row">
                  <div className="como-search-box">
                    <Search size={16} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search for delicious food..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <X size={16} className="clear-icon" onClick={() => setSearchQuery('')} />
                    )}
                  </div>
                  
                  {/* Cart Header Quick Button */}
                  <button className="como-quick-cart" onClick={() => setCartOpen(true)} title="View Cart">
                    <ShoppingBag size={20} />
                    {getCartCount() > 0 && <span className="quick-cart-badge">{getCartCount()}</span>}
                  </button>
                </div>

                {/* Diet Filters: Veg / Non-Veg Toggles */}
                <div className="como-diet-filters">
                  <button 
                    className={`como-diet-btn veg ${vegOnly ? 'active' : ''}`}
                    onClick={() => { setVegOnly(!vegOnly); setNonVegOnly(false); }}
                  >
                    <span className="dot-indicator green"></span>
                    <span>Veg Only</span>
                  </button>
                  
                  <button 
                    className={`como-diet-btn nonveg ${nonVegOnly ? 'active' : ''}`}
                    onClick={() => { setNonVegOnly(!nonVegOnly); setVegOnly(false); }}
                  >
                    <span className="dot-indicator red"></span>
                    <span>Non-Veg Only</span>
                  </button>
                </div>

                {/* Horizontal Category Pills */}
                <div className="como-category-nav">
                  <button 
                    className={`como-cat-pill ${selectedCatId === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCatId('all')}
                  >
                    🍽️ All Dishes
                  </button>
                  {categories.map(c => (
                    <button 
                      key={c.id}
                      className={`como-cat-pill ${selectedCatId === c.id ? 'active' : ''}`}
                      onClick={() => setSelectedCatId(c.id)}
                    >
                      <span className="cat-icon">{c.icon || '🍽️'}</span>
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Food Cards */}
              <div className="como-dishes-grid">
                {filteredItems.length === 0 ? (
                  <div className="como-empty-search">
                    <Inbox size={40} className="text-muted" />
                    <h3>No dishes found</h3>
                    <p>Try searching for a different keyword or removing filters.</p>
                  </div>
                ) : (
                  filteredItems.map(item => {
                    const cartItem = cart[item.id];
                    const dishImg = getDishImage(item, categories);
                    const spiceLevel = getSpiceLevel(item);
                    return (
                      <div key={item.id} className="como-dish-card animated">
                        <div className="dish-details-col">
                          <div className="dish-tags-row">
                            {item.is_veg ? (
                              <div className="diet-tag veg-square" title="Vegetarian"><div className="green-dot"></div></div>
                            ) : (
                              <div className="diet-tag nonveg-square" title="Non-Vegetarian"><div className="red-dot"></div></div>
                            )}
                            
                            {/* Spice level indicator */}
                            {spiceLevel > 0 && (
                              <div className="como-spice-level" title={`Spice Level: ${spiceLevel}`}>
                                {[...Array(spiceLevel)].map((_, i) => (
                                  <Flame key={i} size={11} className="spice-flame-icon" fill="#FF3D00" />
                                ))}
                              </div>
                            )}
                          </div>

                          <h3 className="dish-card-title">{item.name}</h3>
                          <p className="dish-card-desc">{item.description}</p>
                          <span className="dish-card-price">{currencySymbol}{item.price}</span>
                        </div>

                        <div className="dish-image-col">
                          <div className="como-dish-image-container">
                            <img src={dishImg} alt={item.name} className="como-card-img" />
                          </div>
                          
                          <div className="como-card-action-overlay">
                            {cartItem ? (
                              <div className="qty-counter absolute-control">
                                <button onClick={() => removeFromCart(item)}><Minus size={12} /></button>
                                <span>{cartItem.quantity}</span>
                                <button onClick={() => addToCart(item)}><Plus size={12} /></button>
                              </div>
                            ) : (
                              <button className="como-card-add-btn" onClick={() => addToCart(item)}>
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
            </div>

            {/* Footer */}
            <div className="como-footer">
              <p className="como-footer-brand">{restaurant.restaurant_name}</p>
              <p className="como-footer-sub">Premium Dining • Powered by Digital Menu Table</p>
            </div>
          </>
        )}
      </div>

      {/* 5. Sticky Bottom Cart Bar */}
      {getCartCount() > 0 && !cartOpen && !orderPlaced && (
        <div className="como-sticky-cart-bar animated" onClick={() => setCartOpen(true)}>
          <div className="cart-bar-left">
            <div className="cart-count-badge">
              <ShoppingBag size={18} />
              <span>{getCartCount()}</span>
            </div>
            <div className="cart-total-details">
              <span className="cart-subtotal">{currencySymbol}{getCartTotal()}</span>
              <span className="cart-label">Plus taxes & service</span>
            </div>
          </div>
          <div className="cart-bar-right">
            <span>View Basket</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* 6. Checkout Drawer Panel */}
      {cartOpen && (
        <div className="como-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="como-drawer animated" onClick={(e) => e.stopPropagation()}>
            
            <div className="como-drawer-header">
              <div className="header-title-box">
                <ShoppingBag size={20} className="text-orange" />
                <h3>Your Basket</h3>
              </div>
              <button className="close-drawer-btn" onClick={() => setCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="como-drawer-body">
              {/* Table setup if not present */}
              <div className="como-input-group">
                <label className="input-label">📍 Confirm Table Number</label>
                <input 
                  type="text" 
                  className="como-form-input"
                  placeholder="Enter Table Number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  required
                />
              </div>

              {/* Items List */}
              <div className="como-drawer-items-container">
                <h4 className="container-title">Order Items</h4>
                {Object.values(cart).length === 0 ? (
                  <p className="empty-cart-text">Your cart is empty.</p>
                ) : (
                  Object.values(cart).map(item => (
                    <div key={item.id} className="como-drawer-item-row">
                      <div className="item-info">
                        <h5>{item.name}</h5>
                        <span className="price">{currencySymbol}{item.price}</span>
                      </div>

                      <div className="qty-counter drawer-qty-scale">
                        <button onClick={() => removeFromCart(item)}><Minus size={10} /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => addToCart(item)}><Plus size={10} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Special Cooking Instructions */}
              <div className="como-input-group extra-top">
                <label className="input-label">📝 Chef Instructions</label>
                <textarea 
                  className="como-form-input textarea"
                  rows="2"
                  placeholder="e.g. Make it extra hot, no garlic, double cheese..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* Price summary */}
              <div className="como-price-breakdown">
                <div className="breakdown-row">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{getCartTotal()}</span>
                </div>
                <div className="breakdown-row">
                  <span>Tax & Service</span>
                  <span className="free-tag">Free Dine-In</span>
                </div>
                <div className="breakdown-row grand-total">
                  <span>Grand Total</span>
                  <span className="amount-glowing">{currencySymbol}{getCartTotal()}</span>
                </div>
              </div>
            </div>

            <div className="como-drawer-footer">
              <button 
                className="como-checkout-btn" 
                onClick={handlePlaceOrder}
                disabled={Object.values(cart).length === 0}
              >
                <ShoppingBag size={20} />
                <span>Place Order via WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline styles for customer mobile look */}
      <style>{`
        /* Deep Charcoal / Obsidian Appetite-Stimulating Theme */
        .client-menu-container {
          background-color: #0A0A0C;
          min-height: 100vh;
          font-family: 'Outfit', 'Inter', sans-serif;
          color: #E4E4E7;
          padding-bottom: 110px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow-x: hidden;
        }

        /* 1. Brand Hero Header Styles */
        .como-hero-banner {
          width: 100%;
          height: 380px;
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 24px;
          text-align: center;
        }
        .como-hero-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 1;
        }
        .como-hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg, rgba(10, 10, 12, 0.2) 0%, rgba(10, 10, 12, 0.95) 100%);
          z-index: 2;
        }
        .como-hero-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          max-width: 480px;
          margin-bottom: 10px;
        }
        .como-logo-badge {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #D4AF37;
          font-size: 11px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.1em;
        }
        .como-brand-title {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          letter-spacing: -0.02em;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .como-brand-tagline {
          font-size: 14px;
          color: #A0A0AB;
          font-weight: 400;
          letter-spacing: 0.05em;
        }
        .como-hero-badges-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 4px;
        }
        .como-badge {
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .como-badge.green {
          background: rgba(16, 185, 129, 0.12);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .como-badge.rating {
          background: rgba(251, 191, 36, 0.12);
          color: #FBBF24;
          border: 1px solid rgba(251, 191, 36, 0.2);
        }
        .como-badge.table-tag {
          background: rgba(255, 94, 0, 0.15);
          color: #FF5E00;
          border: 1px solid rgba(255, 94, 0, 0.25);
          box-shadow: 0 0 10px rgba(255, 94, 0, 0.1);
        }
        .como-hero-cta {
          display: flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border: none;
          font-size: 14px;
          font-weight: 700;
          padding: 10px 24px;
          border-radius: 9999px;
          cursor: pointer;
          margin-top: 10px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(255, 94, 0, 0.4);
        }
        .como-hero-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 94, 0, 0.6);
        }

        /* Content Container Layout */
        .como-main-content {
          width: 100%;
          max-width: 600px;
          padding: 0 16px;
          z-index: 10;
          flex-grow: 1;
        }

        /* Chef Recommendations Carousel */
        .como-popular-section {
          margin-top: 12px;
          margin-bottom: 28px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 14px;
        }
        .section-header .title-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .section-header h2 {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
        }
        .section-header .sub-label {
          font-size: 12px;
          color: #71717A;
          font-weight: 500;
        }
        .como-popular-carousel {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding: 4px 0 12px 0;
          scrollbar-width: none;
          scroll-snap-type: x mandatory;
        }
        .como-popular-carousel::-webkit-scrollbar {
          display: none;
        }
        .como-popular-card {
          flex: 0 0 220px;
          scroll-snap-align: start;
          background: rgba(30, 30, 35, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease;
        }
        .como-popular-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1);
        }
        .card-image-box {
          height: 130px;
          position: relative;
          overflow: hidden;
          background: #18181b;
        }
        .card-image-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .como-popular-card:hover .card-image-box img {
          transform: scale(1.05);
        }
        .card-image-box .card-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #FF5E00;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }
        .card-info {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-grow: 1;
        }
        .card-info h3 {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .item-desc-short {
          font-size: 11px;
          color: #A0A0AB;
          line-height: 1.4;
          height: 32px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .card-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 6px;
        }
        .card-price {
          font-size: 14px;
          font-weight: 800;
          color: #FFB300;
        }

        /* Mini Quantifier */
        .como-mini-add-btn {
          background: rgba(255, 94, 0, 0.1);
          color: #FF5E00;
          border: 1px solid rgba(255, 94, 0, 0.3);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .como-mini-add-btn:hover {
          background: #FF5E00;
          color: #ffffff;
        }

        /* 3. Catalog Section Styles */
        .como-menu-catalog {
          background: rgba(18, 18, 22, 0.5);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .como-sticky-header {
          position: sticky;
          top: 0;
          background: rgba(18, 18, 22, 0.95);
          margin-left: -16px;
          margin-right: -16px;
          margin-top: -16px;
          padding: 16px;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .como-search-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .como-search-box {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 10px 14px;
          gap: 10px;
          flex-grow: 1;
        }
        .como-search-box input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          color: #ffffff;
          font-size: 14px;
          font-family: inherit;
        }
        .como-search-box input::placeholder {
          color: #71717A;
        }
        .search-icon, .clear-icon {
          color: #71717A;
        }
        .clear-icon { cursor: pointer; }

        .como-quick-cart {
          position: relative;
          background: rgba(255, 94, 0, 0.1);
          border: 1px solid rgba(255, 94, 0, 0.2);
          color: #FF5E00;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .como-quick-cart:hover {
          background: #FF5E00;
          color: #ffffff;
        }
        .quick-cart-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ffffff;
          color: #FF5E00;
          font-size: 10px;
          font-weight: 800;
          min-width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FF5E00;
        }

        .como-diet-filters {
          display: flex;
          gap: 8px;
        }
        .como-diet-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02);
          font-size: 12px;
          font-weight: 600;
          color: #A0A0AB;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .como-diet-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }
        .como-diet-btn.veg.active {
          background: rgba(16, 185, 129, 0.08);
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.1);
        }
        .como-diet-btn.nonveg.active {
          background: rgba(239, 68, 68, 0.08);
          color: #EF4444;
          border-color: rgba(239, 68, 68, 0.3);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.1);
        }
        .dot-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .dot-indicator.green { background: #10B981; }
        .dot-indicator.red { background: #EF4444; }

        /* Horizontal Category Nav */
        .como-category-nav {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          white-space: nowrap;
          padding-bottom: 2px;
        }
        .como-category-nav::-webkit-scrollbar {
          display: none;
        }
        .como-cat-pill {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(255, 255, 255, 0.02);
          font-size: 13px;
          font-weight: 600;
          color: #A0A0AB;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .como-cat-pill:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
        }
        .como-cat-pill.active {
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border-color: transparent;
          box-shadow: 0 4px 12px rgba(255, 94, 0, 0.35);
        }

        /* Menu Food Cards List */
        .como-dishes-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }
        .como-dish-card {
          display: flex;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 16px;
          gap: 16px;
          transition: all 0.2s ease;
        }
        .como-dish-card:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
        }
        .dish-details-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dish-tags-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dish-card-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
        }
        .dish-card-desc {
          font-size: 12px;
          color: #71717A;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dish-card-price {
          font-size: 15px;
          font-weight: 800;
          color: #FFB300;
          margin-top: 4px;
        }

        /* Veg / NonVeg Square Symbols */
        .diet-tag {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .diet-tag.veg-square {
          border: 2px solid #10B981;
        }
        .diet-tag.veg-square .green-dot {
          width: 6px;
          height: 6px;
          background: #10B981;
          border-radius: 50%;
        }
        .diet-tag.nonveg-square {
          border: 2px solid #EF4444;
        }
        .diet-tag.nonveg-square .red-dot {
          width: 0;
          height: 0;
          border-left: 3.5px solid transparent;
          border-right: 3.5px solid transparent;
          border-bottom: 6px solid #EF4444;
        }
        .diet-tag.veg-circle {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 5;
          background: rgba(0,0,0,0.6);
          padding: 4px;
          border-radius: 50%;
          border: 1px solid #10B981;
          width: 20px;
          height: 20px;
        }
        .diet-tag.veg-circle .green-dot {
          width: 8px;
          height: 8px;
          background: #10B981;
          border-radius: 50%;
        }
        .diet-tag.nonveg-circle {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 5;
          background: rgba(0,0,0,0.6);
          padding: 4px;
          border-radius: 50%;
          border: 1px solid #EF4444;
          width: 20px;
          height: 20px;
        }
        .diet-tag.nonveg-circle .red-dot {
          width: 8px;
          height: 8px;
          background: #EF4444;
          border-radius: 50%;
        }

        /* Spice Level Flames */
        .como-spice-level {
          display: flex;
          align-items: center;
          gap: 1px;
        }
        .spice-flame-icon {
          animation: wiggle 1s ease infinite alternate;
        }
        @keyframes wiggle {
          0% { transform: scale(1); }
          100% { transform: scale(1.1) rotate(5deg); }
        }

        /* Food Card Image Column */
        .dish-image-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 100px;
          height: 100px;
          flex-shrink: 0;
        }
        .como-dish-image-container {
          width: 100px;
          height: 100px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: #18181B;
        }
        .como-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .como-dish-card:hover .como-card-img {
          transform: scale(1.06);
        }

        /* Add / Qty Control on Image */
        .como-card-action-overlay {
          position: absolute;
          bottom: -8px;
          z-index: 5;
          width: 80px;
          display: flex;
          justify-content: center;
        }
        .como-card-add-btn {
          width: 100%;
          background: #ffffff;
          color: #FF5E00;
          border: 1px solid #FF5E00;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        .como-card-add-btn:hover {
          background: #FF5E00;
          color: #ffffff;
        }

        /* Standard Quantity Counter */
        .qty-counter {
          display: flex;
          align-items: center;
          background: #FF5E00;
          color: #ffffff;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(255, 94, 0, 0.2);
        }
        .qty-counter.absolute-control {
          width: 80px;
          justify-content: space-between;
        }
        .qty-counter button {
          border: none;
          background: none;
          color: #ffffff;
          padding: 6px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .qty-counter button:hover {
          background: rgba(0, 0, 0, 0.15);
        }
        .qty-counter span {
          font-size: 12px;
          font-weight: 800;
          min-width: 16px;
          text-align: center;
        }

        /* Footer */
        .como-footer {
          text-align: center;
          padding: 24px 0 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          width: 100%;
          margin-top: 20px;
        }
        .como-footer-brand {
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .como-footer-sub {
          font-size: 10px;
          color: #52525B;
          margin-top: 4px;
        }

        /* 5. Sticky Bottom Cart Bar */
        .como-sticky-cart-bar {
          position: fixed;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 560px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border-radius: 16px;
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 10px 30px rgba(255, 94, 0, 0.35);
          z-index: 999;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .como-sticky-cart-bar:hover {
          transform: translateX(-50%) translateY(-2px);
        }
        .cart-bar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cart-count-badge {
          background: rgba(255, 255, 255, 0.15);
          padding: 6px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 800;
        }
        .cart-total-details {
          display: flex;
          flex-direction: column;
        }
        .cart-subtotal {
          font-size: 15px;
          font-weight: 800;
        }
        .cart-label {
          font-size: 9px;
          opacity: 0.8;
        }
        .cart-bar-right {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          font-weight: 700;
        }

        /* 6. Checkout Drawer Styles */
        .como-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          z-index: 1000;
          display: flex;
          justify-content: center;
          backdrop-filter: blur(4px);
        }

        .como-drawer {
          position: fixed;
          bottom: 0;
          width: 100%;
          max-width: 600px;
          background: #121216;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          max-height: 85vh;
          z-index: 1010;
          animation: slideUpDrawer 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }
        @keyframes slideUpDrawer {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .como-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .header-title-box {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-title-box h3 {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
        }
        .text-orange { color: #FF5E00; }
        .close-drawer-btn {
          border: none;
          background: rgba(255, 255, 255, 0.04);
          color: #71717A;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .close-drawer-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .como-drawer-body {
          padding: 20px;
          overflow-y: auto;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .como-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .como-input-group.extra-top {
          margin-top: 12px;
        }
        .input-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #A0A0AB;
        }
        .como-form-input {
          width: 100%;
          padding: 12px 14px;
          background-color: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #ffffff;
          font-family: inherit;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .como-form-input:focus {
          outline: none;
          border-color: #FF5E00;
          background-color: rgba(255, 255, 255, 0.04);
          box-shadow: 0 0 0 3px rgba(255, 94, 0, 0.15);
        }
        .como-form-input.textarea {
          resize: none;
        }

        .como-drawer-items-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 4px;
        }
        .como-drawer-items-container .container-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #A0A0AB;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding-bottom: 6px;
          margin-bottom: 2px;
        }
        .empty-cart-text {
          font-size: 13px;
          color: #71717A;
          font-style: italic;
        }
        .como-drawer-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding-bottom: 10px;
        }
        .como-drawer-item-row .item-info h5 {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }
        .como-drawer-item-row .item-info .price {
          font-size: 12px;
          color: #FFB300;
          font-weight: 700;
        }
        .drawer-qty-scale {
          transform: scale(0.85);
          transform-origin: right center;
        }

        .como-price-breakdown {
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
          padding-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .breakdown-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #A0A0AB;
        }
        .free-tag {
          color: #10B981;
          font-weight: 700;
        }
        .grand-total {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 10px;
        }
        .amount-glowing {
          color: #FFB300;
          font-size: 18px;
          text-shadow: 0 0 10px rgba(255, 179, 0, 0.2);
        }

        .como-drawer-footer {
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .como-checkout-btn {
          width: 100%;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border: none;
          padding: 14px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(255, 94, 0, 0.3);
          transition: all 0.2s ease;
        }
        .como-checkout-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 94, 0, 0.5);
        }
        .como-checkout-btn:disabled {
          background: #27272a;
          color: #71717a;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        /* Success Card Views */
        .como-success-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          margin-top: 20px;
        }
        .success-icon-ring {
          width: 64px;
          height: 64px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10B981;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .como-success-card h2 {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
        }
        .success-desc {
          font-size: 13px;
          color: #A0A0AB;
          max-width: 320px;
          line-height: 1.5;
        }
        .como-receipt-box {
          background: #121216;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          text-align: left;
        }
        .como-receipt-box .receipt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .como-receipt-box h4 {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #71717A;
        }
        .receipt-status-badge {
          font-size: 9px;
          font-weight: 700;
          color: #FFB300;
          background: rgba(255, 179, 0, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .receipt-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        .receipt-meta-grid span {
          display: block;
        }
        .receipt-meta-grid .label {
          font-size: 9px;
          text-transform: uppercase;
          color: #52525B;
          letter-spacing: 0.05em;
        }
        .receipt-meta-grid .value {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
        }
        .receipt-divider {
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
          margin: 12px 0;
        }
        .receipt-items-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .receipt-item-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .receipt-item-row .item-name {
          color: #A0A0AB;
        }
        .receipt-item-row .item-price {
          color: #ffffff;
          font-weight: 600;
        }
        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
        }
        .receipt-total-row .total-val {
          color: #FFB300;
          font-size: 16px;
          font-weight: 800;
        }
        .como-order-more-btn {
          margin-top: 10px;
          width: 100%;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
        }

        /* General Helper Animations */
        .animated {
          animation-duration: 0.3s;
          animation-fill-mode: both;
        }
        .animated.fadeIn {
          animation-name: fadeIn;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Media adjustments */
        @media (max-width: 480px) {
          .como-hero-banner {
            height: 320px;
          }
          .como-brand-title {
            font-size: 26px;
          }
          .como-popular-card {
            flex: 0 0 190px;
          }
          .card-image-box {
            height: 110px;
          }
          .como-dish-card {
            padding: 12px;
            gap: 12px;
          }
          .como-dish-image-container {
            width: 85px;
            height: 85px;
          }
          .dish-image-col {
            width: 85px;
            height: 85px;
          }
          .como-card-action-overlay {
            width: 75px;
          }
          .como-card-add-btn {
            padding: 4px 8px;
            font-size: 10px;
          }
          .qty-counter.absolute-control {
            width: 75px;
          }
        }
      `}</style>
    </div>
  );
}
