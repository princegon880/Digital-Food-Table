const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// @route   GET /api/categories
// @desc    Get all categories for authenticated restaurant
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', req.user.id)
      .order('order', { ascending: true });

    if (error) throw error;
    res.json(categories);
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// @route   POST /api/categories
// @desc    Create a category
// @access  Private
router.post('/', requireAuth, async (req, res) => {
  const { name, icon, order } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert([
        {
          restaurant_id: req.user.id,
          name,
          icon: icon || '🍽️',
          order: order || 0
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private
router.put('/:id', requireAuth, async (req, res) => {
  const { name, icon, order } = req.body;
  const categoryId = req.params.id;

  try {
    // 1. Verify category ownership
    const { data: category, error: checkError } = await supabase
      .from('categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (checkError || !category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this category' });
    }

    // 2. Perform update
    const { data: updatedCategory, error: updateError } = await supabase
      .from('categories')
      .update({
        name: name !== undefined ? name : undefined,
        icon: icon !== undefined ? icon : undefined,
        order: order !== undefined ? order : undefined
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json(updatedCategory);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private
router.delete('/:id', requireAuth, async (req, res) => {
  const categoryId = req.params.id;

  try {
    // 1. Verify ownership
    const { data: category, error: checkError } = await supabase
      .from('categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (checkError || !category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this category' });
    }

    // 2. Delete
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (deleteError) throw deleteError;
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
