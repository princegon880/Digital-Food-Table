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
      .ilike('slug', slug);
    
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

// @route   POST /api/auth/sync-profile
// @desc    Sync Clerk authenticated user with Supabase profiles table
// @access  Private
router.post('/sync-profile', requireAuth, async (req, res) => {
  const { restaurantName, email, phoneNumber } = req.body;

  if (!restaurantName || !email || !phoneNumber) {
    return res.status(400).json({ error: 'Please enter all fields' });
  }

  const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const phoneInt = parseInt(cleanPhone, 10);

  try {
    // 1. Check if profile already exists for this Clerk ID
    const { data: existingProfile, error: getError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (getError) throw getError;
    if (existingProfile) {
      // If it exists but is a default placeholder profile, update it with the actual registration details!
      const isDefaultName = existingProfile.restaurant_name === 'My Restaurant';
      const isDefaultPhone = existingProfile.phone_number === 0 || String(existingProfile.phone_number) === '0' || String(existingProfile.phone_number) === '0000000000';
      
      if (isDefaultName || isDefaultPhone) {
        console.log(`Race condition detected for Clerk ID ${req.user.id}. Updating default profile with real registration details...`);
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            restaurant_name: restaurantName,
            phone_number: phoneInt,
            email: cleanEmail
          })
          .eq('id', req.user.id)
          .select()
          .single();

        if (updateError) {
          console.error('Race condition update error:', updateError);
          return res.status(500).json({ error: 'Failed to update existing default profile: ' + updateError.message });
        }

        if (updatedProfile) {
          return res.status(200).json({
            message: 'Profile updated with signup details',
            profile: updatedProfile
          });
        }
      }
      return res.status(200).json({
        message: 'Profile already synced',
        profile: existingProfile
      });
    }

    // 2. Check if phone number is taken by another user
    const { data: existingPhone } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', phoneInt);

    if (existingPhone && existingPhone.length > 0) {
      return res.status(400).json({ error: 'A restaurant with this phone number already exists' });
    }

    // 3. Check if email is taken by another user
    const { data: existingEmail } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail);

    if (existingEmail && existingEmail.length > 0) {
      return res.status(400).json({ error: 'A restaurant with this email address already exists' });
    }

    // 4. Generate unique slug
    const slug = await generateUniqueSlug(restaurantName);

    // 5. Create new profile in Supabase
    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .insert([
        {
          id: req.user.id,
          restaurant_name: restaurantName,
          slug: slug,
          phone_number: phoneInt,
          email: cleanEmail
        }
      ])
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    res.status(201).json({
      message: 'Profile created successfully',
      profile: profileData
    });
  } catch (err) {
    console.error('Profile sync error:', err);
    res.status(500).json({ error: err.message || 'Server error during profile sync' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user details (with self-healing fallback)
// @access  Private
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .maybeSingle();

    if (dbError) {
      console.error('Database fetch profile error:', dbError);
      return res.status(500).json({ error: 'Database error fetching profile' });
    }

    if (profileData) {
      return res.json({
        user: {
          id: req.user.id,
          email: req.user.email || profileData.email
        },
        profile: profileData
      });
    }

    // Self-healing: if authenticated but profile doesn't exist, create a default one
    console.log(`Profile not found for Clerk ID ${req.user.id}. Auto-creating default profile...`);
    const shortId = req.user.id.substring(req.user.id.length - 6);
    const baseSlug = `restaurant-${shortId}`;
    const slug = await generateUniqueSlug(baseSlug);

    const { data: newProfile, error: dbCreateError } = await supabase
      .from('profiles')
      .insert([
        {
          id: req.user.id,
          restaurant_name: 'My Restaurant',
          slug: slug,
          phone_number: 0,
          email: ''
        }
      ])
      .select()
      .single();

    if (dbCreateError) {
      console.error('Database auto-create profile error:', dbCreateError);
      return res.status(500).json({ error: 'Failed to initialize default profile' });
    }

    res.json({
      user: {
        id: req.user.id,
        email: newProfile.email
      },
      profile: newProfile
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
  const { restaurantName, phoneNumber, currency, coverImage, establishedYear, tagline, slug, orderMode } = req.body;
  const updates = {};
  
  if (restaurantName !== undefined) updates.restaurant_name = restaurantName;
  if (phoneNumber !== undefined) {
    const cleanPhone = String(phoneNumber).replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }
    updates.phone_number = parseInt(cleanPhone, 10);
  }
  if (currency !== undefined) updates.currency = currency;
  if (coverImage !== undefined) updates.cover_image = coverImage;
  if (establishedYear !== undefined) updates.established_year = establishedYear;
  if (tagline !== undefined) updates.tagline = tagline;
  if (orderMode !== undefined) {
    const validModes = ['whatsapp', 'dashboard', 'both'];
    if (!validModes.includes(orderMode)) {
      return res.status(400).json({ error: 'Invalid order mode. Must be whatsapp, dashboard, or both.' });
    }
    updates.order_mode = orderMode;
  }

  try {
    if (slug !== undefined) {
      const cleanSlug = slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      if (!cleanSlug) {
        return res.status(400).json({ error: 'URL slug cannot be empty' });
      }
      
      // Check if slug is taken by another user
      const { data: existingProfiles, error: slugCheckError } = await supabase
        .from('profiles')
        .select('id, slug')
        .ilike('slug', cleanSlug);
        
      if (slugCheckError) {
        return res.status(500).json({ error: 'Database check failed during slug validation' });
      }
      
      const alreadyTaken = existingProfiles && existingProfiles.some(p => p.id !== req.user.id);
      if (alreadyTaken) {
        return res.status(400).json({ error: 'This URL slug is already taken by another restaurant' });
      }
      
      updates.slug = cleanSlug;
    }

    let result = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    // If update fails due to missing columns, retry without the unknown columns
    if (result.error && result.error.message && (
      result.error.message.includes('established_year') ||
      result.error.message.includes('tagline') ||
      result.error.message.includes('order_mode')
    )) {
      console.warn('DB column missing. Retrying profile update without optional columns:', result.error.message);
      const safeUpdates = { ...updates };
      delete safeUpdates.established_year;
      delete safeUpdates.tagline;
      delete safeUpdates.order_mode;
      
      result = await supabase
        .from('profiles')
        .update(safeUpdates)
        .eq('id', req.user.id)
        .select()
        .single();
    }

    if (result.error) {
      return res.status(400).json({ error: 'Failed to update profile: ' + result.error.message });
    }

    // If order_mode was in the original updates but got stripped (column missing),
    // merge it back into the response so the frontend still reflects the selection.
    const responseData = { ...result.data };
    if (updates.order_mode !== undefined && responseData.order_mode === undefined) {
      responseData.order_mode = updates.order_mode;
    }

    res.json(responseData);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

module.exports = router;
