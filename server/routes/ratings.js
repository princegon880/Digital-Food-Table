const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// @route   POST /api/ratings
// @desc    Submit a customer rating (Public — no auth required)
// @access  Public
router.post('/', async (req, res) => {
  const { restaurantSlug, tableNumber, rating, feedback } = req.body;

  if (!restaurantSlug || !rating) {
    return res.status(400).json({ error: 'restaurantSlug and rating are required' });
  }

  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Resolve restaurant_id from slug
    const { data: restaurant, error: restError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('slug', restaurantSlug.trim())
      .single();

    if (restError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const { data: newRating, error: ratingError } = await supabase
      .from('ratings')
      .insert([{
        restaurant_id: restaurant.id,
        table_number: tableNumber ? String(tableNumber) : null,
        rating: ratingNum,
        feedback: (feedback || '').trim()
      }])
      .select()
      .single();

    if (ratingError) throw ratingError;

    res.status(201).json(newRating);
  } catch (err) {
    console.error('Submit rating error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit rating' });
  }
});

// @route   GET /api/ratings
// @desc    Get all ratings for the authenticated restaurant
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: ratings, error } = await supabase
      .from('ratings')
      .select('*')
      .eq('restaurant_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(ratings || []);
  } catch (err) {
    console.error('Fetch ratings error:', err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

module.exports = router;
