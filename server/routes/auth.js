const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// Helper to generate unique URL-friendly slug
const generateUniqueSlug = async (restaurantName) => {
  let baseSlug = restaurantName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  if (!baseSlug) baseSlug = 'restaurant';
  
  let slug = baseSlug;
  let isUnique = false;
  let counter = 0;

  while (!isUnique) {
    const { data, error } = await supabase
      .from('profiles')
      .select('slug')
      .eq('slug', slug);
    
    if (error) {
      throw new Error('Database check failed during slug generation');
    }

    if (data.length === 0) {
      isUnique = true;
    } else {
      counter++;
      slug = `${baseSlug}-${counter}-${Math.floor(Math.random() * 100)}`;
    }
  }
  return slug;
};

// @route   POST /api/auth/register
// @desc    Register a new restaurant owner
router.post('/register', async (req, res) => {
  const { restaurantName, phoneNumber, password } = req.body;

  if (!restaurantName || !phoneNumber || !password) {
    return res.status(400).json({ error: 'Please enter all fields' });
  }

  // Format phone number to clean text (no spaces, non-numeric)
  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 8) {
    return res.status(400).json({ error: 'Please enter a valid phone number' });
  }

  const dummyEmail = `${cleanPhone}@qrmenu.com`;

  try {
    // 1. Check if profile already exists for this phone number
    const { data: existingProfiles, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', cleanPhone);

    if (profileCheckError) throw profileCheckError;
    if (existingProfiles && existingProfiles.length > 0) {
      return res.status(400).json({ error: 'A restaurant with this phone number already exists' });
    }

    // 2. Sign up in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: dummyEmail,
      password: password
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Signup failed, user not created' });
    }

    // 3. Generate unique slug
    const slug = await generateUniqueSlug(restaurantName);

    // 4. Create record in profiles table
    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          restaurant_name: restaurantName,
          slug: slug,
          phone_number: cleanPhone
        }
      ])
      .select()
      .single();

    if (dbError) {
      // Clean up created auth user if db insert fails
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanUpError) {
        console.error('Failed to clean up auth user after db error:', cleanUpError.message);
      }
      return res.status(500).json({ error: 'Failed to create profile: ' + dbError.message });
    }

    res.status(201).json({
      message: 'Registration successful',
      token: authData.session?.access_token || authData.session?.token, // access token if returned immediately
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      profile: profileData
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate restaurant owner & get token
router.post('/login', async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ error: 'Please enter all fields' });
  }

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const dummyEmail = `${cleanPhone}@qrmenu.com`;

  try {
    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: password
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Fetch associated profile
    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (dbError) {
      return res.status(500).json({ error: 'Failed to fetch restaurant profile: ' + dbError.message });
    }

    res.json({
      token: authData.session.access_token,
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      profile: profileData
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (dbError) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      user: {
        id: req.user.id,
        email: req.user.email
      },
      profile: profileData
    });
  } catch (err) {
    console.error('Fetch me error:', err);
    res.status(500).json({ error: 'Server error fetching user details' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update restaurant profile settings
// @access  Private
router.put('/profile', requireAuth, async (req, res) => {
  const { restaurantName, phoneNumber, currency, coverImage } = req.body;
  const updates = {};
  
  if (restaurantName !== undefined) updates.restaurant_name = restaurantName;
  if (phoneNumber !== undefined) {
    updates.phone_number = phoneNumber.replace(/[^0-9]/g, '');
  }
  if (currency !== undefined) updates.currency = currency;
  if (coverImage !== undefined) updates.cover_image = coverImage;

  try {
    const { data: updatedProfile, error: dbError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (dbError) {
      return res.status(400).json({ error: 'Failed to update profile: ' + dbError.message });
    }

    res.json(updatedProfile);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

module.exports = router;
