const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// @route   GET /api/public/menu/:slug
// @desc    Fetch restaurant menu configurations, categories, and items by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  if (!slug) {
    return res.status(400).json({ error: 'Restaurant slug is required' });
  }

  try {
    // 1. Fetch restaurant profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, restaurant_name, slug, phone_number, currency, cover_image, established_year')
      .eq('slug', slug.toLowerCase())
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // 2. Fetch categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', profile.id)
      .order('order', { ascending: true });

    if (categoriesError) throw categoriesError;

    // 3. Fetch active menu items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', profile.id)
      .eq('is_available', true); // only fetch currently available items for customers

    if (itemsError) throw itemsError;

    res.json({
      profile,
      categories,
      items
    });
  } catch (err) {
    console.error('Fetch public menu error:', err);
    res.status(500).json({ error: err.message || 'Failed to load restaurant menu' });
  }
});

module.exports = router;
