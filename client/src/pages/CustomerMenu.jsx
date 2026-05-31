import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api, resolveImageUrl } from '../utils/api';
import { triggerHaptic } from '../utils/haptic';
import confetti from 'canvas-confetti';
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
  ChevronRight,
  MapPin,
  Globe,
  Check
} from 'lucide-react';

// ── Language config ────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी',   flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்',   flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు',  flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी',   flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা',   flag: '🇮🇳' },
];

// Static UI string translations (only things outside dish data)
const UI_STRINGS = {
  en: {
    searchPlaceholder: 'Search for delicious food...',
    allDishes: '🍽️ All Dishes',
    vegOnly: 'Veg Only',
    nonVegOnly: 'Non-Veg Only',
    viewBasket: 'View Basket',
    yourBasket: 'Your Basket',
    placeOrder: 'Place Order',
    tableLabel: '📍 Table Number',
    chefsSpecials: "Chef's Specials",
    popularChoices: 'Popular choices',
    mustTry: 'Must Try',
    addBtn: 'ADD',
    orderSent: 'Order Sent!',
    orderMoreBtn: 'Order More Dishes',
    langLabel: 'Language',
    qrToastTitle: "You're seated at Table",
    qrToastSub: 'Scanned via QR Code • Tap to change',
  },
  hi: {
    searchPlaceholder: 'स्वादिष्ट खाना खोजें...',
    allDishes: '🍽️ सभी व्यंजन',
    vegOnly: 'केवल शाकाहारी',
    nonVegOnly: 'केवल मांसाहारी',
    viewBasket: 'टोकरी देखें',
    yourBasket: 'आपकी टोकरी',
    placeOrder: 'ऑर्डर करें',
    tableLabel: '📍 टेबल नंबर',
    chefsSpecials: 'शेफ की विशेषताएं',
    popularChoices: 'लोकप्रिय चुनाव',
    mustTry: 'जरूर आजमाएं',
    addBtn: 'जोड़ें',
    orderSent: 'ऑर्डर भेजा!',
    orderMoreBtn: 'और व्यंजन ऑर्डर करें',
    langLabel: 'भाषा',
    qrToastTitle: 'आप टेबल पर बैठे हैं',
    qrToastSub: 'QR कोड से स्कैन • बदलने के लिए टैप करें',
  },
  ta: {
    searchPlaceholder: 'சுவையான உணவு தேடுங்கள்...',
    allDishes: '🍽️ அனைத்து உணவுகள்',
    vegOnly: 'சைவம் மட்டும்',
    nonVegOnly: 'அசைவம் மட்டும்',
    viewBasket: 'கூடையை பார்க்க',
    yourBasket: 'உங்கள் கூடை',
    placeOrder: 'ஆர்டர் செய்',
    tableLabel: '📍 மேஜை எண்',
    chefsSpecials: 'சமையல்காரர் சிறப்புகள்',
    popularChoices: 'பிரபலமான தேர்வுகள்',
    mustTry: 'கட்டாயம் முயற்சிக்க',
    addBtn: 'சேர்',
    orderSent: 'ஆர்டர் அனுப்பப்பட்டது!',
    orderMoreBtn: 'மேலும் ஆர்டர் செய்',
    langLabel: 'மொழி',
    qrToastTitle: 'நீங்கள் மேஜையில் அமர்ந்துள்ளீர்கள்',
    qrToastSub: 'QR குறியீடு மூலம் ஸ்கேன் • மாற்ற தட்டவும்',
  },
  te: {
    searchPlaceholder: 'రుచికరమైన వంటలు వెతకండి...',
    allDishes: '🍽️ అన్ని వంటకాలు',
    vegOnly: 'శాకాహారం మాత్రమే',
    nonVegOnly: 'మాంసాహారం మాత్రమే',
    viewBasket: 'బాస్కెట్ చూడండి',
    yourBasket: 'మీ బాస్కెట్',
    placeOrder: 'ఆర్డర్ చేయండి',
    tableLabel: '📍 టేబుల్ నంబర్',
    chefsSpecials: 'చెఫ్ స్పెషల్స్',
    popularChoices: 'జనాదరణ పొందిన ఎంపికలు',
    mustTry: 'తప్పనిసరిగా ప్రయత్నించండి',
    addBtn: 'జోడించు',
    orderSent: 'ఆర్డర్ పంపబడింది!',
    orderMoreBtn: 'మరిన్ని వంటకాలు ఆర్డర్ చేయండి',
    langLabel: 'భాష',
    qrToastTitle: 'మీరు టేబుల్ వద్ద కూర్చున్నారు',
    qrToastSub: 'QR కోడ్ ద్వారా స్కాన్ • మార్చడానికి నొక్కండి',
  },
  mr: {
    searchPlaceholder: 'चविष्ट जेवण शोधा...',
    allDishes: '🍽️ सर्व पदार्थ',
    vegOnly: 'फक्त शाकाहारी',
    nonVegOnly: 'फक्त मांसाहारी',
    viewBasket: 'टोपली पहा',
    yourBasket: 'तुमची टोपली',
    placeOrder: 'ऑर्डर द्या',
    tableLabel: '📍 टेबल नंबर',
    chefsSpecials: 'शेफची विशेषता',
    popularChoices: 'लोकप्रिय निवडी',
    mustTry: 'नक्की वापरून पहा',
    addBtn: 'जोडा',
    orderSent: 'ऑर्डर पाठवला!',
    orderMoreBtn: 'आणखी पदार्थ ऑर्डर करा',
    langLabel: 'भाषा',
    qrToastTitle: 'तुम्ही टेबलवर बसला आहात',
    qrToastSub: 'QR कोड स्कॅन • बदलण्यासाठी टॅप करा',
  },
  bn: {
    searchPlaceholder: 'সুস্বাদু খাবার খুঁজুন...',
    allDishes: '🍽️ সব খাবার',
    vegOnly: 'শুধু নিরামিষ',
    nonVegOnly: 'শুধু আমিষ',
    viewBasket: 'ঝুড়ি দেখুন',
    yourBasket: 'আপনার ঝুড়ি',
    placeOrder: 'অর্ডার করুন',
    tableLabel: '📍 টেবিল নম্বর',
    chefsSpecials: 'শেফের বিশেষত্ব',
    popularChoices: 'জনপ্রিয় পছন্দ',
    mustTry: 'অবশ্যই চেষ্টা করুন',
    addBtn: 'যোগ করুন',
    orderSent: 'অর্ডার পাঠানো হয়েছে!',
    orderMoreBtn: 'আরও খাবার অর্ডার করুন',
    langLabel: 'ভাষা',
    qrToastTitle: 'আপনি টেবিলে বসেছেন',
    qrToastSub: 'QR কোড স্ক্যান • পরিবর্তন করতে ট্যাপ করুন',
  },
};

// Free Google Translate endpoint (no API key, uses web widget backend)
async function googleTranslate(text, targetLang) {
  if (!text || targetLang === 'en') return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0]?.map(s => s[0]).join('') || text;
  } catch {
    return text;
  }
}


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
    return resolveImageUrl(item.image_url);
  }
  
  const cat = categoriesList.find(c => c.id === item.category_id);
  const catName = cat ? cat.name.toLowerCase() : '';
  const itemName = item.name.toLowerCase();
  
  if (catName.includes('pizza') || itemName.includes('pizza')) return CATEGORY_IMAGES.pizza;
  if (catName.includes('burger') || itemName.includes('burger')) return CATEGORY_IMAGES.burger;
  if (catName.includes('pasta') || itemName.includes('pasta') || catName.includes('noodle') || itemName.includes('noodle')) return CATEGORY_IMAGES.pasta;
  if (catName.includes('drink') || itemName.includes('drink') || catName.includes('beverage') || itemName.includes('beverage') || itemName.includes('mojito') || itemName.includes('shake') || itemName.includes('coffee') || itemName.includes('tea')) return CATEGORY_IMAGES.drinks;
  if (catName.includes('dessert') || itemName.includes('dessert') || catName.includes('sweet') || itemName.includes('sweet') || itemName.includes('cake') || itemName.includes('waffle') || itemName.includes('brownie') || itemName.includes('ice cream')) return CATEGORY_IMAGES.desserts;
  if (catName.includes('starter') || itemName.includes('starter') || catName.includes('appetizer') || itemName.includes('appetizer') || itemName.includes('wings') || itemName.includes('fries') || itemName.includes('garlic bread')) return CATEGORY_IMAGES.starters;
  return CATEGORY_IMAGES.default;
};

const getSpiceLevel = (item) => {
  const text = `${item.name} ${item.description || ''}`.toLowerCase();
  if (text.includes('extra spicy') || text.includes('fire') || text.includes('ghost pepper') || text.includes('devil') || text.includes('insane')) return 3;
  if (text.includes('spicy') || text.includes('chili') || text.includes('hot') || text.includes('schezwan') || text.includes('peri') || text.includes('jalapeno') || text.includes('chilli')) return 2;
  if (text.includes('mild') || text.includes('pepper') || text.includes('cajun') || text.includes('spiced')) return 1;
  return 0;
};

// triggerHaptic is imported from '../utils/haptic'

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

  // ── NEW: Table number modal state ──────────────────────────────────────────
  // Show modal if no table number from URL and never confirmed yet this session
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [tableModalInput, setTableModalInput] = useState('');
  const [tableModalVisible, setTableModalVisible] = useState(false);
  const [tableModalError, setTableModalError] = useState('');
  const [tableCheckingOccupancy, setTableCheckingOccupancy] = useState(false);

  // ── NEW: Cart add feedback animation key ───────────────────────────────────
  const [cartBump, setCartBump] = useState(false);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [addedItems, setAddedItems] = useState({}); // track per-item flash

  // ── Language & translation state ──────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('menu_lang') || 'en');
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const translationCache = useRef({});
  const [translatedItems, setTranslatedItems] = useState({});

  // ── QR table confirmation toast ───────────────────────────────────────────
  const [showTableToast, setShowTableToast] = useState(false);

  // Rating states
  const [customerRating, setCustomerRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      try {
        setError('');
        const data = await api.get(`/public/menu/${slug}`);
        setRestaurant(data.profile);
        setCategories(data.categories);
        setItems(data.items);
        if (data.profile && data.profile.restaurant_name) {
          localStorage.setItem(`restaurant_name_${slug}`, data.profile.restaurant_name);
        }
      } catch (err) {
        setError(err.message || 'Failed to load menu. Make sure the link is correct.');
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, [slug]);

  // ── Show table number modal after menu loads if no table in URL ────────────
  useEffect(() => {
    if (!loading && !error && !tableParam) {
      // Small delay so the hero animation completes first
      const timer = setTimeout(() => {
        setTableModalOpen(true);
        // Trigger CSS animation
        requestAnimationFrame(() => setTableModalVisible(true));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [loading, error, tableParam]);

  // ── QR toast: show once per session when table comes from URL ─────────────
  useEffect(() => {
    if (!loading && !error && tableParam) {
      const key = `table_toast_shown_${slug}_${tableParam}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setTimeout(() => {
          setShowTableToast(true);
          triggerHaptic('success');
          setTimeout(() => setShowTableToast(false), 4000);
        }, 900);
      }
    }
  }, [loading, error, tableParam, slug]);

  // ── Batch-translate all items when language changes ───────────────────────
  useEffect(() => {
    if (lang === 'en' || items.length === 0) {
      setTranslatedItems({});
      return;
    }
    let cancelled = false;
    async function translateAll() {
      const result = {};
      for (const item of items) {
        const cacheKey = `${item.id}_${lang}`;
        if (translationCache.current[cacheKey]) {
          result[item.id] = translationCache.current[cacheKey];
        } else {
          const [name, desc] = await Promise.all([
            googleTranslate(item.name, lang),
            item.description ? googleTranslate(item.description, lang) : Promise.resolve(''),
          ]);
          const translated = { name, description: desc };
          translationCache.current[cacheKey] = translated;
          result[item.id] = translated;
        }
      }
      if (!cancelled) setTranslatedItems(result);
    }
    translateAll();
    return () => { cancelled = true; };
  }, [lang, items]);

  // ── t() helper for static UI strings ─────────────────────────────────────
  const t = (key) => (UI_STRINGS[lang] || UI_STRINGS.en)[key] || UI_STRINGS.en[key] || key;

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

  // ── Table modal confirm ────────────────────────────────────────────────────
  const confirmTableNumber = async () => {
    const val = tableModalInput.trim();
    if (!val) {
      triggerHaptic('error');
      setTableModalError('Please enter a table number.');
      return;
    }

    // If the customer is changing to a DIFFERENT table, check occupancy
    if (val !== tableNumber) {
      setTableCheckingOccupancy(true);
      setTableModalError('');
      try {
        const data = await api.get(
          `/orders/check-table?slug=${encodeURIComponent(slug)}&table=${encodeURIComponent(val)}`
        );
        if (data.occupied) {
          triggerHaptic('error');
          setTableModalError(
            `⛔ Table ${val} is currently occupied by another party. Please choose a different table or ask staff for help.`
          );
          setTableCheckingOccupancy(false);
          return;
        }
      } catch {
        // Network / server error — fail open so customer is never stuck
      } finally {
        setTableCheckingOccupancy(false);
      }
    }

    setTableNumber(val);
    setTableModalError('');
    triggerHaptic('success');
    setTableModalVisible(false);
    setTimeout(() => setTableModalOpen(false), 280);
  };

  const skipTableModal = () => {
    triggerHaptic('light');
    setTableModalVisible(false);
    setTimeout(() => setTableModalOpen(false), 280);
  };

  // ── Cart operations ────────────────────────────────────────────────────────
  const addToCart = useCallback((item) => {
    triggerHaptic('light');
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

    // Trigger bump animation on cart bar
    setLastAddedId(item.id);
    setCartBump(true);
    setTimeout(() => setCartBump(false), 400);

    // Trigger per-item flash
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => setAddedItems(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    }), 600);
  }, []);

  const removeFromCart = useCallback((item) => {
    triggerHaptic('light');
    setCart(prevCart => {
      const existing = prevCart[item.id];
      if (!existing) return prevCart;
      const updatedCart = { ...prevCart };
      if (existing.quantity === 1) {
        delete updatedCart[item.id];
      } else {
        updatedCart[item.id] = { ...existing, quantity: existing.quantity - 1 };
      }
      return updatedCart;
    });
  }, []);

  const getCartTotal = () => Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const getCartCount = () => Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  // Place Order Handler
  const handlePlaceOrder = async () => {
    if (!tableNumber) {
      triggerHaptic('error');
      // Instead of alert, open the table modal nicely
      setTableModalInput('');
      setTableModalOpen(true);
      requestAnimationFrame(() => setTableModalVisible(true));
      setCartOpen(false);
      return;
    }

    const cartItemsList = Object.values(cart);
    if (cartItemsList.length === 0) return;

    triggerHaptic('success');
    const total = getCartTotal();
    const mode = restaurant.order_mode || 'both';
    const sendWhatsApp = mode === 'whatsapp' || mode === 'both';
    const sendDashboard = mode === 'dashboard' || mode === 'both';

    try {
      const currency = restaurant.currency || '₹';
      let message = `*NEW ORDER - ${restaurant.restaurant_name}*\n`;
      message += `*Table:* ${tableNumber}\n`;
      message += `------------------------\n`;
      cartItemsList.forEach(item => {
        message += `• ${item.quantity}x ${item.name} - ${currency}${item.price * item.quantity}\n`;
      });
      message += `------------------------\n`;
      message += `*Total Amount:* ${currency}${total}\n`;
      if (specialInstructions.trim()) message += `\n*Note:* ${specialInstructions}\n`;
      message += `\n_Placed via QR Dine Menu_`;

      const encodedText = encodeURIComponent(message);
      let cleanPhone = restaurant.phone_number;
      if (String(cleanPhone).length === 10 && (restaurant.currency === '₹' || !restaurant.currency)) {
        cleanPhone = '91' + cleanPhone;
      }
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

      const simulatedOrder = { table_number: tableNumber, items: cartItemsList, total_price: total };
      setPlacedOrderDetails(simulatedOrder);
      setCart({});
      setSpecialInstructions('');
      setCartOpen(false);
      setOrderPlaced(true);

      setTimeout(() => {
        const brandColors = ['#FF5E00', '#FFB300', '#ffffff', '#ec008c', '#FF3D00'];
        confetti({ particleCount: 70, angle: 60, spread: 65, origin: { x: 0, y: 0.7 }, colors: brandColors, gravity: 0.9, scalar: 1.1 });
        confetti({ particleCount: 70, angle: 120, spread: 65, origin: { x: 1, y: 0.7 }, colors: brandColors, gravity: 0.9, scalar: 1.1 });
      }, 200);

      if (sendWhatsApp) window.open(whatsappUrl, '_blank');
      if (sendDashboard) {
        api.post('/orders', {
          restaurantSlug: slug,
          tableNumber: tableNumber,
          items: cartItemsList.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
          totalPrice: total
        }).catch(err => console.warn('Live Kitchen save failed:', err.message));
      }
    } catch (err) {
      triggerHaptic('error');
      alert('Order placement failed: ' + err.message);
    }
  };

  // Submit customer star rating
  const handleRatingSubmit = async (stars, feedback = '') => {
    setRatingSubmitting(true);
    try {
      await api.post('/ratings', { restaurantSlug: slug, tableNumber, rating: stars, feedback: feedback.trim() });
    } catch (err) {
      console.warn('Rating submission failed (non-blocking):', err.message);
    } finally {
      setRatingSubmitting(false);
      setRatingSubmitted(true);
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
    const cachedName = localStorage.getItem(`restaurant_name_${slug}`);
    const loadingName = cachedName || (slug ? slug.split('-').join(' ').toUpperCase() : 'LOADING...');
    return (
      <div className="menu-client-loading">
        <div className="luxury-loader"></div>
        <h2 className="loading-brand animate-pulse">{loadingName}</h2>
        <p className="loading-sub">Preparing digital menu...</p>
        <style>{`
          .menu-client-loading {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; height: 100vh; background: #09090b;
            color: #ffffff; font-family: 'Outfit', sans-serif; gap: 12px;
          }
          .luxury-loader {
            position: relative; width: 50px; height: 50px; margin-bottom: 8px;
          }
          .luxury-loader::before, .luxury-loader::after {
            content: ''; position: absolute; border-radius: 50%; border: 3px solid transparent;
          }
          .luxury-loader::before {
            top: 0; left: 0; right: 0; bottom: 0; border-top-color: #FF5E00;
            animation: spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
          }
          .luxury-loader::after {
            top: 8px; left: 8px; right: 8px; bottom: 8px; border-bottom-color: #FFB300;
            animation: spinReverse 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
          }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes spinReverse { 0% { transform: rotate(0deg); } 100% { transform: rotate(-360deg); } }
          .loading-brand { font-size: 20px; font-weight: 700; letter-spacing: 0.2em; color: #ffffff; }
          .loading-sub { font-size: 13px; color: #71717a; letter-spacing: 0.05em; }
          .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
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
        <Link to="/" className="btn-primary error-home-btn">Back to Home</Link>
        <style>{`
          .menu-client-error {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 100vh; background: #09090b; color: #a0a0ab;
            padding: 40px 24px; font-family: 'Outfit', sans-serif; text-align: center;
          }
          .empty-icon { color: #ef4444; margin-bottom: 20px; opacity: 0.8; }
          .menu-client-error h2 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
          .menu-client-error p { font-size: 14px; color: #71717a; max-width: 320px; line-height: 1.5; margin-bottom: 24px; }
          .error-home-btn {
            background: var(--gradient-brand, linear-gradient(90deg, #ff4e00 0%, #ec008c 100%));
            color: white; padding: 12px 24px; border-radius: 8px; font-size: 14px;
            font-weight: bold; text-decoration: none; border: none;
            box-shadow: 0 4px 14px rgba(255, 78, 0, 0.3); transition: all 0.2s ease;
          }
          .error-home-btn:hover { transform: translateY(-2px); opacity: 0.9; }
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

  // Save lang preference
  const handleLangChange = (code) => {
    triggerHaptic('light');
    setLang(code);
    localStorage.setItem('menu_lang', code);
    setLangPickerOpen(false);
  };

  return (
    <div className="client-menu-container" onClick={() => langPickerOpen && setLangPickerOpen(false)}>

      {/* ── TABLE NUMBER MODAL (Bottom Sheet) ─────────────────────────────── */}
      {tableModalOpen && (
        <div
          className={`table-modal-overlay ${tableModalVisible ? 'visible' : ''}`}
          onClick={skipTableModal}
        >
          <div
            className={`table-modal-sheet ${tableModalVisible ? 'visible' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="sheet-drag-handle" />

            <div className="sheet-icon-ring">
              <MapPin size={22} color="#FF5E00" />
            </div>
            <h2 className="sheet-title">
              {tableNumber ? 'Change Your Table' : 'Which table are you at?'}
            </h2>
            <p className="sheet-sub">
              {tableNumber
                ? `Currently at Table ${tableNumber}. Enter the correct table number below.`
                : 'Enter your table number so the kitchen knows where to serve you.'}
            </p>

            <input
              type="number"
              inputMode="numeric"
              className="sheet-table-input"
              placeholder="e.g. 5"
              value={tableModalInput}
              onChange={e => { setTableModalInput(e.target.value); setTableModalError(''); }}
              onKeyDown={e => e.key === 'Enter' && confirmTableNumber()}
              autoFocus
              disabled={tableCheckingOccupancy}
            />

            {/* Occupancy error block */}
            {tableModalError && (
              <div className="table-modal-error">
                <span>{tableModalError}</span>
              </div>
            )}

            <button
              className="sheet-confirm-btn"
              onClick={confirmTableNumber}
              disabled={tableCheckingOccupancy}
            >
              {tableCheckingOccupancy ? (
                <><span className="sheet-checking-spinner" /> <span>Checking table...</span></>
              ) : (
                <><MapPin size={16} />
                <span>
                  {tableModalInput.trim()
                    ? (tableNumber ? `Change to Table ${tableModalInput.trim()}` : `Sit at Table ${tableModalInput.trim()}`)
                    : (tableNumber ? 'Update Table' : 'Confirm Table')}
                </span></>
              )}
            </button>

            {!tableNumber && (
              <button className="sheet-skip-btn" onClick={skipTableModal}>
                Skip for now — I'll enter it later
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── QR TABLE CONFIRMATION TOAST ───────────────────────────────────── */}
      <div className={`qr-table-toast ${showTableToast ? 'visible' : ''}`}
        onClick={() => {
          setShowTableToast(false);
          triggerHaptic('light');
          setTableModalInput(tableNumber);
          setTableModalOpen(true);
          requestAnimationFrame(() => setTableModalVisible(true));
        }}
      >
        <div className="qr-toast-icon-ring">
          <Check size={16} color="#fff" strokeWidth={3} />
        </div>
        <div className="qr-toast-text">
          <span className="qr-toast-title">{t('qrToastTitle')} <strong>{tableNumber}</strong></span>
          <span className="qr-toast-sub">{t('qrToastSub')}</span>
        </div>
        <button className="qr-toast-close" onClick={(e) => { e.stopPropagation(); setShowTableToast(false); }}>
          <X size={14} />
        </button>
      </div>

      {/* 1. Brand Hero Header */}
      <div className="como-hero-banner">
        <div className="como-hero-overlay"></div>
        <img 
          src={restaurant.cover_image && restaurant.cover_image.trim() !== '' ? resolveImageUrl(restaurant.cover_image) : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80'} 
          alt={restaurant.restaurant_name} 
          className="como-hero-img" 
        />
        
        <div className="como-hero-content">
          <div className="como-logo-badge">
            <Sparkles size={16} className="text-warning" />
            <span>EST. {restaurant.established_year || '2026'}</span>
          </div>
          <h1 className="como-brand-title">{restaurant.restaurant_name}</h1>
          <p className="como-brand-tagline">{restaurant.tagline || 'Premium Dining Experience'}</p>
          
          <div className="como-hero-badges-row">
            <span className="como-badge green">🟢 Dine-In Open</span>
            <button
              className={`como-badge ${tableNumber ? 'table-tag table-tag-editable' : 'table-tag-btn'}`}
              onClick={() => {
                triggerHaptic('light');
                setTableModalInput(tableNumber || '');
                setTableModalOpen(true);
                requestAnimationFrame(() => setTableModalVisible(true));
              }}
              title={tableNumber ? 'Tap to change table number' : 'Set your table number'}
              aria-label={tableNumber ? `Table ${tableNumber} — tap to change` : 'Set table number'}
            >
              {tableNumber ? `📍 Table ${tableNumber} ✏️` : '📍 Set Table Number'}
            </button>
          </div>

          <button className="como-hero-cta" onClick={() => { triggerHaptic('medium'); scrollToCatalog(); }}>
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
            <h2>{t('orderSent')}</h2>
            <p className="success-desc">
              {(() => {
                const mode = restaurant?.order_mode || 'both';
                if (mode === 'whatsapp') return 'Your order has been sent via WhatsApp. Show this to a staff member if needed. 📱';
                if (mode === 'dashboard') return 'Your order has been sent directly to the kitchen screen. Sit tight! 🖥️';
                return 'Your order is being sent via WhatsApp and has been recorded in our kitchen system. 🎉';
              })()}
            </p>
            
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

            {/* ⭐ Customer Rating Widget */}
            <div className="como-rating-section">
              {!ratingSubmitted ? (
                <>
                  <p className="rating-prompt">How was your ordering experience?</p>
                  <div className="star-row">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        className="star-btn"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => {
                          triggerHaptic('light');
                          setCustomerRating(star);
                          if (star >= 4) handleRatingSubmit(star);
                        }}
                      >
                        <Star
                          size={30}
                          fill={(hoverRating || customerRating) >= star ? '#FFB300' : 'none'}
                          color={(hoverRating || customerRating) >= star ? '#FFB300' : 'rgba(255,255,255,0.2)'}
                          strokeWidth={1.5}
                        />
                      </button>
                    ))}
                  </div>

                  {customerRating > 0 && customerRating <= 3 && (
                    <div className="rating-feedback-area">
                      <p className="rating-feedback-label">Sorry about that! Tell us what went wrong:</p>
                      <textarea
                        className="como-form-input textarea"
                        rows="2"
                        placeholder="e.g. Slow response, confusing menu, wrong item..."
                        value={ratingFeedback}
                        onChange={e => setRatingFeedback(e.target.value)}
                      />
                      <button
                        className="rating-submit-btn"
                        onClick={() => {
                          triggerHaptic('success');
                          handleRatingSubmit(customerRating, ratingFeedback);
                        }}
                        disabled={ratingSubmitting}
                      >
                        {ratingSubmitting ? 'Submitting...' : 'Send Feedback'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rating-thank-you">
                  {customerRating >= 4 ? (
                    <>
                      <p className="rating-thanks-msg">🎉 Thank you! So glad you loved it!</p>
                      <button
                        className="rating-share-btn"
                        onClick={() => {
                          triggerHaptic('medium');
                          const shareText = `Just ordered at *${restaurant.restaurant_name}* using their digital menu — super easy! 🍽️\n\nCheck it out: ${window.location.origin}/menu/${slug}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                        }}
                      >
                        <span>📱</span>
                        <span>Share with friends via WhatsApp</span>
                      </button>
                    </>
                  ) : (
                    <p className="rating-thanks-msg">💙 Thanks for the feedback! We'll improve.</p>
                  )}
                </div>
              )}
            </div>

            <button className="btn-primary como-order-more-btn" onClick={() => {
              triggerHaptic('medium');
              setOrderPlaced(false);
              setTranslatedItems({});
              setCustomerRating(0);
              setHoverRating(0);
              setRatingFeedback('');
              setRatingSubmitted(false);
            }}>
              {t('orderMoreBtn')}
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
                    <h2>{t('chefsSpecials')}</h2>
                  </div>
                  <span className="sub-label">{t('popularChoices')}</span>
                </div>
                
                <div className="como-popular-carousel">
                  {popularItems.map(item => {
                    const cartItem = cart[item.id];
                    const dishImg = getDishImage(item, categories);
                    return (
                      <div key={item.id} className="como-popular-card">
                        <div className="card-image-box">
                          <img src={dishImg} alt={item.name} />
                          <div className="card-badge">{t('mustTry')}</div>
                          {item.is_veg ? (
                            <div className="diet-tag veg-circle"><div className="green-dot"></div></div>
                          ) : (
                            <div className="diet-tag nonveg-circle"><div className="red-dot"></div></div>
                          )}
                        </div>
                        <div className="card-info">
                          <h3>{translatedItems[item.id]?.name ?? item.name}</h3>
                          <p className="item-desc-short">{translatedItems[item.id]?.description ?? item.description}</p>
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
                                <button
                                  className={`como-mini-add-btn ${addedItems[item.id] ? 'flash' : ''}`}
                                  onClick={() => addToCart(item)}
                                >
                                  <span>{t('addBtn')}</span>
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
                      placeholder={t('searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <X size={16} className="clear-icon" onClick={() => { triggerHaptic('light'); setSearchQuery(''); }} />
                    )}
                  </div>
                  
                  {/* Cart Header Quick Button */}
                  <button
                    className={`como-quick-cart ${cartBump ? 'bump' : ''}`}
                    onClick={() => { triggerHaptic('medium'); setCartOpen(true); }}
                    title="View Cart"
                  >
                    <ShoppingBag size={20} />
                    {getCartCount() > 0 && <span className="quick-cart-badge">{getCartCount()}</span>}
                  </button>
                </div>

                {/* Diet Filters */}
                <div className="como-diet-filters">
                  <button 
                    className={`como-diet-btn veg ${vegOnly ? 'active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setVegOnly(!vegOnly); setNonVegOnly(false); }}
                  >
                    <span className="dot-indicator green"></span>
                    <span>{t('vegOnly')}</span>
                  </button>
                  
                  <button 
                    className={`como-diet-btn nonveg ${nonVegOnly ? 'active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setNonVegOnly(!nonVegOnly); setVegOnly(false); }}
                  >
                    <span className="dot-indicator red"></span>
                    <span>{t('nonVegOnly')}</span>
                  </button>
                </div>

                {/* Horizontal Category Pills */}
                <div className="como-category-nav">
                  <button 
                    className={`como-cat-pill ${selectedCatId === 'all' ? 'active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setSelectedCatId('all'); }}
                  >
                    {t('allDishes')}
                  </button>
                  {categories.map(c => (
                    <button 
                      key={c.id}
                      className={`como-cat-pill ${selectedCatId === c.id ? 'active' : ''}`}
                      onClick={() => { triggerHaptic('light'); setSelectedCatId(c.id); }}
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
                      <div key={item.id} className={`como-dish-card animated ${addedItems[item.id] ? 'card-added-flash' : ''}`}>
                        <div className="dish-details-col">
                          <div className="dish-tags-row">
                            {item.is_veg ? (
                              <div className="diet-tag veg-square" title="Vegetarian"><div className="green-dot"></div></div>
                            ) : (
                              <div className="diet-tag nonveg-square" title="Non-Vegetarian"><div className="red-dot"></div></div>
                            )}
                            
                            {spiceLevel > 0 && (
                              <div className="como-spice-level" title={`Spice Level: ${spiceLevel}`}>
                                {[...Array(spiceLevel)].map((_, i) => (
                                  <Flame key={i} size={11} className="spice-flame-icon" fill="#FF3D00" />
                                ))}
                              </div>
                            )}
                          </div>

                          <h3 className="dish-card-title">{translatedItems[item.id]?.name ?? item.name}</h3>
                          <p className="dish-card-desc">{translatedItems[item.id]?.description ?? item.description}</p>
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
                              <button
                                className={`como-card-add-btn ${addedItems[item.id] ? 'flash' : ''}`}
                                onClick={() => addToCart(item)}
                              >
                                <span>{t('addBtn')}</span>
                                <Plus size={14} />
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
              <p className="como-footer-sub">{restaurant.tagline || 'Premium Dining Experience'} • Powered by Digital Menu Table</p>
            </div>
          </>
        )}
      </div>

      {/* 5. Sticky Bottom Cart Bar — Swiggy-style floating bar */}
      {getCartCount() > 0 && !cartOpen && !orderPlaced && (
        <div
          className={`como-sticky-cart-bar ${cartBump ? 'bump' : ''}`}
          onClick={() => { triggerHaptic('medium'); setCartOpen(true); }}
        >
          <div className="cart-bar-left">
            <div className="cart-count-badge">
              <ShoppingBag size={18} />
              <span>{getCartCount()} {getCartCount() === 1 ? 'item' : 'items'}</span>
            </div>
            <div className="cart-total-details">
              <span className="cart-subtotal">{currencySymbol}{getCartTotal()}</span>
              <span className="cart-label">Tap to view basket</span>
            </div>
          </div>
          <div className="cart-bar-right">
            <span>{t('viewBasket')}</span>
            <ChevronRight size={16} />
          </div>
        </div>
      )}

      {/* 6. Checkout Drawer Panel */}
      {cartOpen && (
        <div className="como-drawer-overlay" onClick={() => { triggerHaptic('light'); setCartOpen(false); }}>
          <div className="como-drawer" onClick={(e) => e.stopPropagation()}>

            {/* Drag pill */}
            <div className="drawer-drag-pill" />

            <div className="como-drawer-header">
              <div className="header-title-box">
                <ShoppingBag size={20} className="text-orange" />
                <h3>{t('yourBasket')}</h3>
                {getCartCount() > 0 && (
                  <span className="drawer-item-count-pill">{getCartCount()} {getCartCount() === 1 ? 'item' : 'items'}</span>
                )}
              </div>
              <button className="close-drawer-btn" onClick={() => { triggerHaptic('light'); setCartOpen(false); }}>
                <X size={22} />
              </button>
            </div>

            <div className="como-drawer-body">

              {/* ── Table Number ────────────────────────── */}
              <div className="como-input-group">
                <label className="input-label">{t('tableLabel')}</label>
                <div className="table-input-row">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={`como-form-input table-num-input ${!tableNumber ? 'input-required-highlight' : 'input-has-value'}`}
                    placeholder="e.g. 5"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                  {tableNumber
                    ? <span className="table-confirmed-tag">✓ Table {tableNumber}</span>
                    : <span className="input-hint">Required to place order</span>
                  }
                </div>
              </div>

              {/* ── Order Items ─────────────────────────── */}
              <div className="como-drawer-items-container">
                <h4 className="container-title">Order Summary</h4>
                {Object.values(cart).length === 0 ? (
                  <p className="empty-cart-text">Your cart is empty.</p>
                ) : (
                  Object.values(cart).map(item => (
                    <div key={item.id} className="como-drawer-item-row">
                      <div className="item-info">
                        <h5>{item.name}</h5>
                        <div className="item-price-row">
                          <span className="unit-price">{currencySymbol}{item.price} × {item.quantity}</span>
                          <span className="line-total">{currencySymbol}{item.price * item.quantity}</span>
                        </div>
                      </div>
                      <div className="drawer-qty-ctrl">
                        <button
                          className="drawer-qty-btn"
                          onClick={() => removeFromCart(item)}
                          aria-label="Remove one"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="drawer-qty-num">{item.quantity}</span>
                        <button
                          className="drawer-qty-btn"
                          onClick={() => addToCart(item)}
                          aria-label="Add one more"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Chef Instructions ───────────────────── */}
              <div className="como-input-group">
                <label className="input-label">📝 Chef Instructions (optional)</label>
                <textarea
                  className="como-form-input textarea"
                  rows="2"
                  placeholder="e.g. No onions, extra spicy, less oil..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              {/* ── Price Breakdown ─────────────────────── */}
              <div className="como-price-breakdown">
                <div className="breakdown-row">
                  <span>Subtotal ({getCartCount()} {getCartCount() === 1 ? 'item' : 'items'})</span>
                  <span>{currencySymbol}{getCartTotal()}</span>
                </div>
                <div className="breakdown-row">
                  <span>Tax & Service</span>
                  <span className="free-tag">Free • Dine-In</span>
                </div>
                <div className="breakdown-row grand-total">
                  <span>Grand Total</span>
                  <span className="amount-glowing">{currencySymbol}{getCartTotal()}</span>
                </div>
              </div>

            </div>

            {/* ── Sticky Place Order Footer ─────────────── */}
            <div className="como-drawer-footer">
              <button
                className="como-checkout-btn"
                onClick={handlePlaceOrder}
                disabled={Object.values(cart).length === 0}
              >
                <ShoppingBag size={20} />
                <span>
                  {(() => {
                    const mode = restaurant?.order_mode || 'both';
                    if (mode === 'whatsapp') return 'Place Order via WhatsApp';
                    if (mode === 'dashboard') return 'Send Order to Kitchen';
                    return 'Place Order';
                  })()}
                </span>
                {getCartCount() > 0 && (
                  <span className="checkout-total-pill">{currencySymbol}{getCartTotal()}</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── LANGUAGE FAB ──────────────────────────────────────────────────── */}
      <div className="lang-fab-wrapper" onClick={e => e.stopPropagation()}>
        {langPickerOpen && (
          <div className="lang-picker-dropdown">
            <div className="lang-picker-header">
              <Globe size={14} />
              <span>{t('langLabel')}</span>
            </div>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                className={`lang-option ${lang === l.code ? 'active' : ''}`}
                onClick={() => handleLangChange(l.code)}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-name">{l.label}</span>
                {lang === l.code && <Check size={13} className="lang-check" />}
              </button>
            ))}
          </div>
        )}
        <button
          className={`lang-fab ${langPickerOpen ? 'open' : ''}`}
          onClick={() => { triggerHaptic('light'); setLangPickerOpen(o => !o); }}
          title="Change Language"
          aria-label="Change menu language"
        >
          <Globe size={17} />
          <span className="lang-fab-code">{LANGUAGES.find(l => l.code === lang)?.flag}</span>
        </button>
      </div>

      {/* Inline styles */}
      <style>{`
        /* Deep Charcoal / Obsidian Appetite-Stimulating Theme */
        .client-menu-container {
          background-color: #0A0A0C;
          min-height: 100vh;
          font-family: 'Outfit', 'Inter', sans-serif;
          color: #E4E4E7;
          padding-bottom: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow-x: hidden;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           TABLE NUMBER BOTTOM SHEET MODAL
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .table-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0);
          z-index: 2000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transition: background 0.28s ease;
          pointer-events: none;
        }
        .table-modal-overlay.visible {
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(6px);
          pointer-events: all;
        }

        .table-modal-sheet {
          width: 100%;
          max-width: 560px;
          background: #18181C;
          border-top: 1px solid rgba(255,255,255,0.08);
          border-top-left-radius: 28px;
          border-top-right-radius: 28px;
          padding: 12px 28px 36px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          text-align: center;
          box-shadow: 0 -20px 60px rgba(0,0,0,0.6);
          transform: translateY(100%);
          transition: transform 0.3s cubic-bezier(0.34, 1.20, 0.64, 1);
        }
        .table-modal-sheet.visible {
          transform: translateY(0);
        }

        .sheet-drag-handle {
          width: 40px;
          height: 4px;
          background: rgba(255,255,255,0.12);
          border-radius: 9999px;
          margin-bottom: 4px;
        }

        .sheet-icon-ring {
          width: 54px;
          height: 54px;
          background: rgba(255, 94, 0, 0.1);
          border: 1px solid rgba(255, 94, 0, 0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(255, 94, 0, 0.15);
        }

        .sheet-title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }

        .sheet-sub {
          font-size: 13px;
          color: #71717A;
          line-height: 1.5;
          max-width: 280px;
          margin: -4px 0 4px 0;
        }

        .sheet-table-input {
          width: 100%;
          padding: 16px 18px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          color: #ffffff;
          font-family: inherit;
          font-size: 28px;
          font-weight: 800;
          text-align: center;
          letter-spacing: 0.08em;
          transition: all 0.2s ease;
          -moz-appearance: textfield;
        }
        .sheet-table-input::-webkit-inner-spin-button,
        .sheet-table-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .sheet-table-input::placeholder { color: rgba(255,255,255,0.18); font-size: 20px; font-weight: 400; }
        .sheet-table-input:focus {
          outline: none;
          border-color: #FF5E00;
          background: rgba(255, 94, 0, 0.04);
          box-shadow: 0 0 0 4px rgba(255, 94, 0, 0.12);
        }

        .sheet-confirm-btn {
          width: 100%;
          padding: 15px 20px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 20px rgba(255, 94, 0, 0.4);
          transition: all 0.2s ease;
        }
        .sheet-confirm-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 94, 0, 0.55);
        }
        .sheet-confirm-btn:active { transform: translateY(0); }

        .sheet-skip-btn {
          background: none;
          border: none;
          color: #52525B;
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s;
        }
        .sheet-skip-btn:hover { color: #A0A0AB; }

        /* Occupancy block error */
        .table-modal-error {
          width: 100%;
          background: rgba(239, 68, 68, 0.10);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-left: 3px solid #ef4444;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          color: #fca5a5;
          line-height: 1.5;
          animation: fadeSlideUp 0.22s ease;
        }

        /* Spinner inside confirm button while checking */
        .sheet-checking-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        .sheet-confirm-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }


        /* Table-tag button in hero */
        .como-badge.table-tag-btn {
          background: rgba(255, 94, 0, 0.08);
          color: #FF5E00;
          border: 1px dashed rgba(255, 94, 0, 0.4);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .como-badge.table-tag-btn:hover {
          background: rgba(255, 94, 0, 0.15);
          border-color: #FF5E00;
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
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          object-fit: cover; z-index: 1;
        }
        .como-hero-overlay {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(180deg, rgba(10, 10, 12, 0.2) 0%, rgba(10, 10, 12, 0.95) 100%);
          z-index: 2;
        }
        .como-hero-content {
          position: relative; z-index: 3;
          display: flex; flex-direction: column; align-items: center;
          gap: 12px; max-width: 480px; margin-bottom: 10px;
        }
        .como-logo-badge {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1); color: #D4AF37;
          font-size: 11px; font-weight: 700; padding: 6px 14px;
          border-radius: 9999px; display: flex; align-items: center; gap: 6px;
          letter-spacing: 0.1em;
        }
        .como-brand-title {
          font-size: 32px; font-weight: 800; color: #ffffff;
          line-height: 1.1; letter-spacing: -0.02em;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        .como-brand-tagline { font-size: 14px; color: #A0A0AB; font-weight: 400; letter-spacing: 0.05em; }
        .como-hero-badges-row {
          display: flex; gap: 8px; flex-wrap: wrap;
          justify-content: center; margin-top: 4px;
        }
        .como-badge {
          font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px;
        }
        .como-badge.green {
          background: rgba(16, 185, 129, 0.12); color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .como-badge.table-tag {
          background: rgba(255, 94, 0, 0.15); color: #FF5E00;
          border: 1px solid rgba(255, 94, 0, 0.25);
          box-shadow: 0 0 10px rgba(255, 94, 0, 0.1);
        }
        /* Editable table badge — always a button, clickable */
        .como-badge.table-tag-editable {
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s ease, border-color 0.2s ease,
                      transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.2s ease;
          /* gentle attention pulse on first render */
          animation: table-badge-pulse 2.5s ease 1.2s 2;
        }
        .como-badge.table-tag-editable:hover {
          background: rgba(255, 94, 0, 0.28);
          border-color: rgba(255, 94, 0, 0.6);
          box-shadow: 0 0 18px rgba(255, 94, 0, 0.25);
          transform: scale(1.05);
        }
        .como-badge.table-tag-editable:active {
          transform: scale(0.97);
        }
        @keyframes table-badge-pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 94, 0, 0.1); }
          50%       { box-shadow: 0 0 20px rgba(255, 94, 0, 0.45); transform: scale(1.06); }
        }
        .como-hero-cta {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff; border: none; font-size: 14px; font-weight: 700;
          padding: 10px 24px; border-radius: 9999px; cursor: pointer;
          margin-top: 10px; transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(255, 94, 0, 0.4); font-family: inherit;
        }
        .como-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 94, 0, 0.6); }

        /* Content Container Layout */
        .como-main-content {
          width: 100%; max-width: 600px; padding: 0 16px; z-index: 10; flex-grow: 1;
        }

        /* Chef Recommendations Carousel */
        .como-popular-section { margin-top: 12px; margin-bottom: 28px; }
        .section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
        .section-header .title-row { display: flex; align-items: center; gap: 6px; }
        .section-header h2 { font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; }
        .section-header .sub-label { font-size: 12px; color: #71717A; font-weight: 500; }
        .como-popular-carousel {
          display: flex; gap: 16px; overflow-x: auto; padding: 4px 0 12px 0;
          scrollbar-width: none; scroll-snap-type: x mandatory;
        }
        .como-popular-carousel::-webkit-scrollbar { display: none; }
        .como-popular-card {
          flex: 0 0 220px; scroll-snap-align: start;
          background: rgba(30, 30, 35, 0.4); backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px; overflow: hidden;
          display: flex; flex-direction: column; transition: transform 0.2s ease;
        }
        .como-popular-card:hover { transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.1); }
        .card-image-box { height: 130px; position: relative; overflow: hidden; background: #18181b; }
        .card-image-box img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .como-popular-card:hover .card-image-box img { transform: scale(1.05); }
        .card-image-box .card-badge {
          position: absolute; top: 8px; left: 8px; background: #FF5E00;
          color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 8px;
          border-radius: 4px; letter-spacing: 0.05em;
        }
        .card-info { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
        .card-info h3 {
          font-size: 14px; font-weight: 700; color: #ffffff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .item-desc-short {
          font-size: 11px; color: #A0A0AB; line-height: 1.4; height: 32px; overflow: hidden;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        }
        .card-footer-row { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
        .card-price { font-size: 14px; font-weight: 800; color: #FFB300; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           BIGGER ADD BUTTON + FLASH ANIMATION
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .como-mini-add-btn {
          background: rgba(255, 94, 0, 0.1);
          color: #FF5E00;
          border: 1.5px solid rgba(255, 94, 0, 0.4);
          border-radius: 8px;
          /* Bigger padding for easier tap target */
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s ease;
          font-family: inherit;
          min-width: 64px;
          justify-content: center;
        }
        .como-mini-add-btn:hover { background: #FF5E00; color: #ffffff; border-color: #FF5E00; }
        .como-mini-add-btn:active { transform: scale(0.92); }
        .como-mini-add-btn.flash {
          animation: addBtnFlash 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes addBtnFlash {
          0%   { transform: scale(1);    background: rgba(255,94,0,0.1); }
          30%  { transform: scale(1.22); background: #FF5E00; color: #fff; }
          60%  { transform: scale(0.95); }
          100% { transform: scale(1);    background: rgba(255,94,0,0.1); color: #FF5E00; }
        }

        /* 3. Catalog Section Styles */
        .como-menu-catalog {
          background: rgba(18, 18, 22, 0.5);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 24px; padding: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .como-sticky-header {
          position: sticky; top: 0;
          background: rgba(18, 18, 22, 0.95);
          margin-left: -16px; margin-right: -16px; margin-top: -16px;
          padding: 16px;
          border-top-left-radius: 24px; border-top-right-radius: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 100; display: flex; flex-direction: column; gap: 12px;
        }
        .como-search-row { display: flex; gap: 8px; align-items: center; }
        .como-search-box {
          display: flex; align-items: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px; padding: 10px 14px; gap: 10px; flex-grow: 1;
        }
        .como-search-box input {
          border: none; background: none; outline: none; width: 100%;
          color: #ffffff; font-size: 14px; font-family: inherit;
        }
        .como-search-box input::placeholder { color: #71717A; }
        .search-icon, .clear-icon { color: #71717A; }
        .clear-icon { cursor: pointer; }

        .como-quick-cart {
          position: relative;
          background: rgba(255, 94, 0, 0.1); border: 1px solid rgba(255, 94, 0, 0.2);
          color: #FF5E00; width: 46px; height: 46px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; transition: all 0.2s ease;
        }
        .como-quick-cart:hover { background: #FF5E00; color: #ffffff; }
        .como-quick-cart.bump { animation: cartBump 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        @keyframes cartBump {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.3) rotate(-8deg); }
          70%  { transform: scale(0.9) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        .quick-cart-badge {
          position: absolute; top: -5px; right: -5px;
          background: #FF5E00; color: #ffffff; font-size: 10px; font-weight: 800;
          min-width: 20px; height: 20px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #0A0A0C;
        }

        .como-diet-filters { display: flex; gap: 8px; }
        .como-diet-btn {
          display: flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.02); font-size: 13px; font-weight: 600;
          color: #A0A0AB; cursor: pointer; transition: all 0.15s ease; font-family: inherit;
        }
        .como-diet-btn:hover { background: rgba(255, 255, 255, 0.05); color: #ffffff; }
        .como-diet-btn.veg.active {
          background: rgba(16, 185, 129, 0.08); color: #10B981;
          border-color: rgba(16, 185, 129, 0.3); box-shadow: 0 0 12px rgba(16, 185, 129, 0.1);
        }
        .como-diet-btn.nonveg.active {
          background: rgba(239, 68, 68, 0.08); color: #EF4444;
          border-color: rgba(239, 68, 68, 0.3); box-shadow: 0 0 12px rgba(239, 68, 68, 0.1);
        }
        .dot-indicator { width: 6px; height: 6px; border-radius: 50%; }
        .dot-indicator.green { background: #10B981; }
        .dot-indicator.red { background: #EF4444; }

        /* Horizontal Category Nav */
        .como-category-nav {
          display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none;
          white-space: nowrap; padding-bottom: 2px;
        }
        .como-category-nav::-webkit-scrollbar { display: none; }
        .como-cat-pill {
          padding: 8px 16px; border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(255, 255, 255, 0.02); font-size: 13px; font-weight: 600;
          color: #A0A0AB; cursor: pointer; transition: all 0.2s ease;
          display: flex; align-items: center; gap: 6px; font-family: inherit;
        }
        .como-cat-pill:hover { background: rgba(255, 255, 255, 0.06); color: #ffffff; }
        .como-cat-pill.active {
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff; border-color: transparent;
          box-shadow: 0 4px 12px rgba(255, 94, 0, 0.35);
        }

        /* Menu Food Cards */
        .como-dishes-grid { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
        .como-empty-search {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 60px 24px; width: 100%; min-height: 350px; margin: 0 auto;
        }
        .como-empty-search h3 {
          margin-top: 16px; margin-bottom: 8px; font-size: 18px; font-weight: 700;
          color: #ffffff; text-align: center; width: 100%;
        }
        .como-empty-search p { font-size: 14px; color: #71717A; max-width: 320px; margin: 0 auto; line-height: 1.5; }
        .como-empty-search .text-muted { color: #71717A; margin: 0 auto; }

        .como-dish-card {
          display: flex; justify-content: space-between;
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px; padding: 16px; gap: 16px; transition: all 0.2s ease;
        }
        .como-dish-card:hover { border-color: rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.03); }
        .como-dish-card.card-added-flash {
          animation: cardFlash 0.45s ease;
        }
        @keyframes cardFlash {
          0%   { border-color: rgba(255, 255, 255, 0.04); background: rgba(255,255,255,0.02); }
          35%  { border-color: rgba(255, 94, 0, 0.5); background: rgba(255, 94, 0, 0.06); }
          100% { border-color: rgba(255, 255, 255, 0.04); background: rgba(255,255,255,0.02); }
        }

        .dish-details-col { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .dish-tags-row { display: flex; align-items: center; gap: 8px; }
        .dish-card-title { font-size: 15px; font-weight: 700; color: #ffffff; }
        .dish-card-desc {
          font-size: 12px; color: #71717A; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .dish-card-price { font-size: 15px; font-weight: 800; color: #FFB300; margin-top: 4px; }

        /* Veg / NonVeg Symbols */
        .diet-tag {
          width: 14px; height: 14px; border-radius: 2px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .diet-tag.veg-square { border: 2px solid #10B981; }
        .diet-tag.veg-square .green-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; }
        .diet-tag.nonveg-square { border: 2px solid #EF4444; }
        .diet-tag.nonveg-square .red-dot {
          width: 0; height: 0;
          border-left: 3.5px solid transparent; border-right: 3.5px solid transparent;
          border-bottom: 6px solid #EF4444;
        }
        .diet-tag.veg-circle {
          position: absolute; top: 8px; right: 8px; z-index: 5;
          background: rgba(0,0,0,0.6); padding: 4px; border-radius: 50%;
          border: 1px solid #10B981; width: 20px; height: 20px;
        }
        .diet-tag.veg-circle .green-dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; }
        .diet-tag.nonveg-circle {
          position: absolute; top: 8px; right: 8px; z-index: 5;
          background: rgba(0,0,0,0.6); padding: 4px; border-radius: 50%;
          border: 1px solid #EF4444; width: 20px; height: 20px;
        }
        .diet-tag.nonveg-circle .red-dot { width: 8px; height: 8px; background: #EF4444; border-radius: 50%; }

        /* Spice Level Flames */
        .como-spice-level { display: flex; align-items: center; gap: 1px; }
        .spice-flame-icon { animation: wiggle 1s ease infinite alternate; }
        @keyframes wiggle { 0% { transform: scale(1); } 100% { transform: scale(1.1) rotate(5deg); } }

        /* Food Card Image Column */
        .dish-image-col {
          display: flex; flex-direction: column; align-items: center;
          position: relative; width: 105px; height: 105px; flex-shrink: 0;
        }
        .como-dish-image-container {
          width: 105px; height: 105px; border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.05); background: #18181B;
        }
        .como-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .como-dish-card:hover .como-card-img { transform: scale(1.06); }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ADD BUTTON — BIGGER, BOLDER, EASIER TO TAP
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .como-card-action-overlay {
          position: absolute; bottom: -12px; z-index: 5;
          width: 92px; display: flex; justify-content: center;
        }
        .como-card-add-btn {
          width: 100%;
          background: #ffffff;
          color: #FF5E00;
          border: 2px solid #FF5E00;
          /* More padding — easier to tap on mobile */
          font-size: 13px;
          font-weight: 900;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          transition: all 0.15s ease;
          font-family: inherit;
          letter-spacing: 0.04em;
          min-height: 38px; /* WCAG touch target */
        }
        .como-card-add-btn:hover { background: #FF5E00; color: #ffffff; }
        .como-card-add-btn:active { transform: scale(0.91); }
        .como-card-add-btn.flash {
          animation: addBtnFlash 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Quantity Counter */
        .qty-counter {
          display: flex; align-items: center;
          background: #FF5E00; color: #ffffff; border-radius: 8px;
          overflow: hidden; box-shadow: 0 4px 10px rgba(255, 94, 0, 0.2);
        }
        .qty-counter.absolute-control { width: 90px; justify-content: space-between; }
        .qty-counter.mini { justify-content: space-between; min-width: 70px; }
        .qty-counter button {
          border: none; background: none; color: #ffffff;
          padding: 8px 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s ease;
          min-height: 38px; /* touch target */
        }
        .qty-counter button:hover { background: rgba(0, 0, 0, 0.15); }
        .qty-counter span { font-size: 13px; font-weight: 800; min-width: 18px; text-align: center; }

        /* Footer */
        .como-footer {
          text-align: center; padding: 24px 0 10px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.04); width: 100%; margin-top: 20px;
        }
        .como-footer-brand { font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 0.1em; text-transform: uppercase; }
        .como-footer-sub { font-size: 10px; color: #52525B; margin-top: 4px; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           FLOATING BOTTOM CART BAR — SWIGGY/ZOMATO STYLE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .como-sticky-cart-bar {
          position: fixed;
          bottom: calc(20px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 560px;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border-radius: 18px;
          padding: 15px 22px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 12px 35px rgba(255, 94, 0, 0.45), 0 4px 12px rgba(0,0,0,0.3);
          z-index: 999;
          cursor: pointer;
          animation: cartBarSlideUp 0.45s cubic-bezier(0.34, 1.35, 0.64, 1) forwards;
        }
        .como-sticky-cart-bar:hover { filter: brightness(1.08); }
        .como-sticky-cart-bar:active { transform: translateX(-50%) scale(0.97); }
        .como-sticky-cart-bar.bump {
          animation: cartBarBump 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes cartBarSlideUp {
          from { transform: translateX(-50%) translateY(100px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
        @keyframes cartBarBump {
          0%   { transform: translateX(-50%) scale(1); }
          35%  { transform: translateX(-50%) scale(1.06) translateY(-4px); }
          65%  { transform: translateX(-50%) scale(0.97); }
          100% { transform: translateX(-50%) scale(1); }
        }
        .cart-bar-left { display: flex; align-items: center; gap: 14px; }
        .cart-count-badge {
          background: rgba(255, 255, 255, 0.18);
          padding: 7px 12px; border-radius: 10px;
          display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800;
        }
        .cart-total-details { display: flex; flex-direction: column; }
        .cart-subtotal { font-size: 16px; font-weight: 900; }
        .cart-label { font-size: 10px; opacity: 0.8; margin-top: 1px; }
        .cart-bar-right { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 700; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CART DRAWER — MOBILE-FIRST FIXES
           Fixes: body-scroll-lock, iOS touch-scroll, safe-area,
           bigger tap targets, item subtotals, thumb-zone CTA
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

        /* Overlay — no backdrop-filter (Android WebView compat) */
        .como-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          /* Prevent taps falling through */
          touch-action: none;
        }

        .como-drawer {
          position: relative;
          width: 100%;
          max-width: 600px;
          background: #141418;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          border-top-left-radius: 26px;
          border-top-right-radius: 26px;
          box-shadow: 0 -16px 48px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          /* KEY FIX: cap height, never cover keyboard */
          max-height: 82dvh;
          max-height: 82vh; /* fallback for older browsers */
          z-index: 1010;
          animation: slideUpDrawer 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          /* iOS momentum scroll fix applied to body inside */
          overflow: hidden;
        }

        @keyframes slideUpDrawer {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Drag pill */
        .drawer-drag-pill {
          width: 36px;
          height: 4px;
          background: rgba(255,255,255,0.14);
          border-radius: 9999px;
          margin: 10px auto 0 auto;
          flex-shrink: 0;
        }

        /* Header */
        .como-drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px 14px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
        }
        .header-title-box {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .header-title-box h3 {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
        }
        .drawer-item-count-pill {
          background: rgba(255, 94, 0, 0.15);
          color: #FF5E00;
          border: 1px solid rgba(255, 94, 0, 0.3);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 9999px;
        }
        .text-orange { color: #FF5E00; }
        .close-drawer-btn {
          border: none;
          background: rgba(255, 255, 255, 0.06);
          color: #A0A0AB;
          /* Bigger tap target */
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
          flex-shrink: 0;
        }
        .close-drawer-btn:hover,
        .close-drawer-btn:active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
        }

        /* Scrollable body — iOS momentum scroll */
        .como-drawer-body {
          padding: 18px 20px 8px 20px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch; /* iOS Safari smooth scroll */
          overscroll-behavior: contain;       /* prevent page scroll bleed */
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* Table number input row */
        .como-input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-label {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em; color: #71717A;
        }
        .table-input-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .table-num-input {
          width: 90px !important;
          flex-shrink: 0;
          text-align: center;
          font-size: 22px !important;
          font-weight: 800 !important;
          letter-spacing: 0.05em;
          padding: 10px 8px !important;
          -moz-appearance: textfield;
        }
        .table-num-input::-webkit-inner-spin-button,
        .table-num-input::-webkit-outer-spin-button { -webkit-appearance: none; }
        .table-confirmed-tag {
          background: rgba(16, 185, 129, 0.1);
          color: #10B981;
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 14px;
          flex-grow: 1;
          text-align: center;
        }
        .input-hint {
          flex-grow: 1;
          font-size: 12px;
          color: #FFB300;
          font-weight: 500;
          text-align: center;
          background: rgba(255, 179, 0, 0.06);
          border: 1px solid rgba(255, 179, 0, 0.15);
          border-radius: 8px;
          padding: 8px 10px;
        }

        /* Form inputs */
        .como-form-input {
          width: 100%;
          padding: 13px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: #ffffff;
          font-family: inherit;
          font-size: 15px;
          transition: all 0.2s ease;
          box-sizing: border-box;
          -webkit-appearance: none; /* iOS rounded corners fix */
        }
        .como-form-input.input-required-highlight { border-color: rgba(255, 179, 0, 0.45); }
        .como-form-input.input-has-value { border-color: rgba(16, 185, 129, 0.35); }
        .como-form-input:focus {
          outline: none;
          border-color: #FF5E00;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 3px rgba(255, 94, 0, 0.14);
        }
        .como-form-input.textarea { resize: none; }

        /* Order items list */
        .como-drawer-items-container {
          display: flex; flex-direction: column; gap: 0;
        }
        .como-drawer-items-container .container-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: #71717A;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 4px;
        }
        .empty-cart-text { font-size: 13px; color: #71717A; font-style: italic; padding: 12px 0; }

        .como-drawer-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 13px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          gap: 12px;
        }
        .como-drawer-item-row:last-child { border-bottom: none; }
        .como-drawer-item-row .item-info {
          flex: 1;
          min-width: 0;
        }
        .como-drawer-item-row .item-info h5 {
          font-size: 14px; font-weight: 600; color: #ffffff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .item-price-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
        }
        .unit-price { font-size: 12px; color: #71717A; }
        .line-total { font-size: 13px; font-weight: 700; color: #FFB300; }

        /* ── Qty control — BIGGER, more thumb-friendly ── */
        .drawer-qty-ctrl {
          display: flex;
          align-items: center;
          background: rgba(255, 94, 0, 0.08);
          border: 1px solid rgba(255, 94, 0, 0.25);
          border-radius: 12px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .drawer-qty-btn {
          border: none;
          background: none;
          color: #FF5E00;
          /* 44×44 WCAG touch target */
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .drawer-qty-btn:hover,
        .drawer-qty-btn:active {
          background: rgba(255, 94, 0, 0.18);
          color: #ffffff;
        }
        .drawer-qty-num {
          font-size: 15px;
          font-weight: 800;
          color: #ffffff;
          min-width: 28px;
          text-align: center;
        }

        /* Price breakdown */
        .como-price-breakdown {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .breakdown-row {
          display: flex; justify-content: space-between;
          font-size: 13px; color: #A0A0AB;
        }
        .free-tag { color: #10B981; font-weight: 700; }
        .grand-total {
          font-size: 15px; font-weight: 800; color: #ffffff;
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          padding-top: 10px;
          margin-top: 2px;
        }
        .amount-glowing {
          color: #FFB300; font-size: 17px;
          text-shadow: 0 0 12px rgba(255, 179, 0, 0.25);
        }

        /* ── Footer — safe-area aware ── */
        .como-drawer-footer {
          padding: 14px 20px;
          /* Add iPhone home-bar gap */
          padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: #141418;
          flex-shrink: 0;
        }
        .como-checkout-btn {
          width: 100%;
          background: linear-gradient(135deg, #FF6B00 0%, #FF3D00 100%);
          color: #ffffff;
          border: none;
          /* Taller CTA — thumb zone */
          padding: 16px 20px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          box-shadow: 0 6px 20px rgba(255, 94, 0, 0.35);
          transition: all 0.2s ease;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .como-checkout-btn:active {
          transform: scale(0.97);
          box-shadow: 0 3px 10px rgba(255, 94, 0, 0.25);
        }
        .como-checkout-btn:disabled {
          background: #27272a; color: #71717a;
          cursor: not-allowed; box-shadow: none; transform: none;
        }
        .checkout-total-pill {
          background: rgba(255,255,255,0.18);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 800;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Success Card */
        .como-success-card {
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px; padding: 30px 20px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          gap: 16px; margin-top: 20px;
        }
        .success-icon-ring {
          width: 64px; height: 64px; background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #10B981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
        }
        .como-success-card h2 { font-size: 22px; font-weight: 800; color: #ffffff; }
        .success-desc { font-size: 13px; color: #A0A0AB; max-width: 320px; line-height: 1.5; }
        .como-receipt-box {
          background: #121216; border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px; padding: 20px; width: 100%; text-align: left;
        }
        .como-receipt-box .receipt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .como-receipt-box h4 { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; color: #71717A; }
        .receipt-status-badge { font-size: 9px; font-weight: 700; color: #FFB300; background: rgba(255, 179, 0, 0.1); padding: 2px 6px; border-radius: 4px; }
        .receipt-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .receipt-meta-grid span { display: block; }
        .receipt-meta-grid .label { font-size: 9px; text-transform: uppercase; color: #52525B; letter-spacing: 0.05em; }
        .receipt-meta-grid .value { font-size: 13px; font-weight: 700; color: #ffffff; }
        .receipt-divider { border-top: 1px dashed rgba(255, 255, 255, 0.06); margin: 12px 0; }
        .receipt-items-list { display: flex; flex-direction: column; gap: 8px; }
        .receipt-item-row { display: flex; justify-content: space-between; font-size: 13px; }
        .receipt-item-row .item-name { color: #A0A0AB; }
        .receipt-item-row .item-price { color: #ffffff; font-weight: 600; }
        .receipt-total-row { display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: 700; color: #ffffff; }
        .receipt-total-row .total-val { color: #FFB300; font-size: 16px; font-weight: 800; }
        .como-order-more-btn { margin-top: 10px; width: 100%; border-radius: 12px; padding: 12px; font-size: 14px; }

        .animated { animation-duration: 0.3s; animation-fill-mode: both; }
        .animated.fadeIn { animation-name: fadeIn; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Media adjustments */
        @media (max-width: 480px) {
          .como-hero-banner {
            display: flex; flex-direction: column; align-items: center;
            justify-content: flex-start; height: auto; padding: 0 0 24px 0; background: #0A0A0C;
          }
          .como-hero-img {
            position: relative; width: 100%; height: auto;
            aspect-ratio: 16/9; object-fit: cover; z-index: 1;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          }
          .como-hero-overlay { display: none; }
          .como-hero-content {
            position: relative; margin-top: 16px; padding: 0 20px; width: 100%; max-width: 100%;
            gap: 12px; display: flex; flex-direction: column; align-items: center; text-align: center;
          }
          .como-brand-title { font-size: 26px; text-shadow: none; }
          .como-popular-card { flex: 0 0 190px; }
          .card-image-box { height: 110px; }
          .como-dish-card { padding: 12px; gap: 12px; }
          .como-dish-image-container { width: 90px; height: 90px; }
          .dish-image-col { width: 90px; height: 90px; }
          .como-card-action-overlay { width: 80px; bottom: -10px; }
          .como-card-add-btn { padding: 7px 8px; font-size: 12px; }
          .qty-counter.absolute-control { width: 80px; }
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STAR RATING WIDGET
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .como-rating-section {
          border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 22px;
          display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 4px; width: 100%;
        }
        .rating-prompt { font-size: 14px; color: rgba(255,255,255,0.55); font-weight: 500; text-align: center; letter-spacing: 0.01em; }
        .star-row { display: flex; gap: 4px; }
        .star-btn {
          background: none; border: none; cursor: pointer; padding: 6px;
          border-radius: 50%; transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex; align-items: center; justify-content: center;
        }
        .star-btn:hover { transform: scale(1.3); }
        .star-btn:active { transform: scale(0.95); }
        .rating-feedback-area { width: 100%; display: flex; flex-direction: column; gap: 10px; animation: fadeSlideUp 0.25s ease; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .rating-feedback-label { font-size: 12px; color: rgba(255,255,255,0.45); text-align: left; }
        .rating-submit-btn {
          background: linear-gradient(90deg, #ff4e00 0%, #ec008c 100%);
          color: white; border: none; padding: 10px 20px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; font-family: inherit;
        }
        .rating-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rating-thank-you { display: flex; flex-direction: column; align-items: center; gap: 12px; animation: fadeSlideUp 0.3s ease; }
        .rating-thanks-msg { font-size: 14px; color: rgba(255,255,255,0.7); font-weight: 500; text-align: center; }
        .rating-share-btn {
          display: flex; align-items: center; gap: 8px; background: #25D366; color: white;
          border: none; padding: 11px 22px; border-radius: 10px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.3);
          font-family: inherit;
        }
        .rating-share-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4); }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           QR TABLE CONFIRMATION TOAST
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .qr-table-toast {
          position: fixed;
          bottom: 96px;
          right: 20px;
          z-index: 3000;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1a1a1e;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-left: 3px solid #22c55e;
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,197,94,0.08);
          max-width: 320px;
          width: calc(100vw - 40px);
          cursor: pointer;
          transform: translateX(calc(100% + 24px));
          opacity: 0;
          transition: transform 0.45s cubic-bezier(0.34, 1.20, 0.64, 1), opacity 0.3s ease;
          pointer-events: none;
          backdrop-filter: blur(12px);
        }
        .qr-table-toast.visible {
          transform: translateX(0);
          opacity: 1;
          pointer-events: all;
        }
        .qr-toast-icon-ring {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 14px rgba(34,197,94,0.4);
          animation: toast-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
        }
        @keyframes toast-pop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .qr-toast-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }
        .qr-toast-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .qr-toast-title strong {
          color: #22c55e;
          font-size: 15px;
        }
        .qr-toast-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.42);
          line-height: 1.4;
        }
        .qr-toast-close {
          background: rgba(255,255,255,0.06);
          border: none;
          color: rgba(255,255,255,0.35);
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .qr-toast-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           LANGUAGE FAB
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .lang-fab-wrapper {
          position: fixed;
          bottom: 90px;
          left: 18px;
          z-index: 2500;
          display: flex;
          flex-direction: column-reverse;
          align-items: flex-start;
          gap: 8px;
        }
        .lang-fab {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #1c1c22;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 22px;
          padding: 9px 14px;
          color: #ffffff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.20, 0.64, 1);
          box-shadow: 0 8px 28px rgba(0,0,0,0.5);
          font-family: 'Outfit', sans-serif;
          font-weight: 600;
        }
        .lang-fab:hover, .lang-fab.open {
          background: #26262e;
          border-color: rgba(255,94,0,0.4);
          box-shadow: 0 0 0 3px rgba(255,94,0,0.12), 0 8px 28px rgba(0,0,0,0.5);
          transform: scale(1.04);
        }
        .lang-fab-code {
          font-size: 17px;
          line-height: 1;
        }
        .lang-picker-dropdown {
          background: #18181e;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
          min-width: 180px;
          animation: langPickerIn 0.25s cubic-bezier(0.34, 1.20, 0.64, 1);
        }
        @keyframes langPickerIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .lang-picker-header {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 11px 16px 8px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lang-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 11px 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.75);
          font-size: 13.5px;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .lang-option:hover {
          background: rgba(255,255,255,0.05);
          color: #ffffff;
        }
        .lang-option.active {
          background: rgba(255, 94, 0, 0.10);
          color: #FF5E00;
          font-weight: 700;
        }
        .lang-flag { font-size: 18px; line-height: 1; }
        .lang-name { flex: 1; }
        .lang-check { color: #FF5E00; flex-shrink: 0; }

        /* Toast position adjustment when cart bar is visible */
        @media (max-width: 480px) {
          .qr-table-toast { bottom: 100px; right: 16px; }
          .lang-fab-wrapper { bottom: 100px; left: 16px; }
        }
      `}</style>
    </div>
  );
}
