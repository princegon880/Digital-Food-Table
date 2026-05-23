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

  let loginEmail = '';
  const isEmail = phoneNumber.includes('@');

  try {
    if (isEmail) {
      loginEmail = phoneNumber.trim().toLowerCase();
    } else {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('phone_number', cleanPhone);

      if (profile && profile.length > 0 && profile[0].email) {
        loginEmail = profile[0].email;
      } else {
        loginEmail = `${cleanPhone}@qrmenu.com`; // fallback to dummy email
      }
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
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
  const { restaurantName, phoneNumber, currency, coverImage, establishedYear, tagline, slug } = req.body;
  const updates = {};
  
  if (restaurantName !== undefined) updates.restaurant_name = restaurantName;
  if (phoneNumber !== undefined) {
    updates.phone_number = phoneNumber.replace(/[^0-9]/g, '');
  }
  if (currency !== undefined) updates.currency = currency;
  if (coverImage !== undefined) updates.cover_image = coverImage;
  if (establishedYear !== undefined) updates.established_year = establishedYear;
  if (tagline !== undefined) updates.tagline = tagline;

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

    // If update fails due to missing columns (e.g. established_year or tagline), try updating without them
    if (result.error && result.error.message && (result.error.message.includes('established_year') || result.error.message.includes('tagline'))) {
      console.warn('DB columns established_year or tagline do not exist. Retrying profile update without them.');
      const safeUpdates = { ...updates };
      delete safeUpdates.established_year;
      delete safeUpdates.tagline;
      
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

    res.json(result.data);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// @route   POST /api/auth/register/send-otp
// @desc    Send OTP code to email for registration verification
router.post('/register/send-otp', async (req, res) => {
  const { restaurantName, email, phoneNumber, password } = req.body;

  if (!restaurantName || !email || !phoneNumber || !password) {
    return res.status(400).json({ error: 'Please enter all fields' });
  }

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 8) {
    return res.status(400).json({ error: 'Please enter a valid phone number' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  try {
    // 1. Check if profile already exists for this phone number
    const { data: existingPhone, error: phoneCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone_number', cleanPhone);

    if (phoneCheckError) throw phoneCheckError;
    if (existingPhone && existingPhone.length > 0) {
      return res.status(400).json({ error: 'A restaurant with this phone number already exists' });
    }

    // 2. Check if profile already exists for this email
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail);

    if (emailCheckError) throw emailCheckError;
    if (existingEmail && existingEmail.length > 0) {
      return res.status(400).json({ error: 'A restaurant with this email address already exists' });
    }

    // 3. Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 4. Save to public.otps table
    const { error: otpError } = await supabase
      .from('otps')
      .insert([
        {
          email: cleanEmail,
          otp_code: otpCode,
          expires_at: expiresAt,
          verified: false
        }
      ]);

    if (otpError) throw otpError;

    // 5. Send Email
    const { sendOtpEmail } = require('../config/mail');
    await sendOtpEmail(cleanEmail, otpCode);

    res.json({ message: 'OTP sent successfully to your email' });
  } catch (err) {
    console.error('Send registration OTP error:', err);
    res.status(500).json({ error: err.message || 'Server error sending registration OTP' });
  }
});

// @route   POST /api/auth/register/verify-otp
// @desc    Verify OTP and complete restaurant owner signup
router.post('/register/verify-otp', async (req, res) => {
  const { restaurantName, email, phoneNumber, password, otpCode } = req.body;

  if (!restaurantName || !email || !phoneNumber || !password || !otpCode) {
    return res.status(400).json({ error: 'Please enter all fields and OTP code' });
  }

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Verify OTP code
    const { data: otpRecords, error: otpCheckError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', cleanEmail)
      .eq('otp_code', otpCode.trim())
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString());

    if (otpCheckError) throw otpCheckError;
    if (!otpRecords || otpRecords.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    const otpRecord = otpRecords[0];

    // 2. Mark OTP as verified
    const { error: otpUpdateError } = await supabase
      .from('otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (otpUpdateError) throw otpUpdateError;

    // 3. Check again if profile/user was created in the meantime
    const { data: existingUserCheck } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail);

    if (existingUserCheck && existingUserCheck.length > 0) {
      return res.status(400).json({ error: 'Account already created' });
    }

    // 4. Create user in Supabase Auth using the real email
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Signup failed, user not created' });
    }

    // 5. Generate unique slug
    const slug = await generateUniqueSlug(restaurantName);

    // 6. Create profile with real email
    const { data: profileData, error: dbError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          restaurant_name: restaurantName,
          slug: slug,
          phone_number: cleanPhone,
          email: cleanEmail
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
      token: authData.session?.access_token || authData.session?.token || `mock-token-${authData.user.id}`,
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      profile: profileData
    });
  } catch (err) {
    console.error('Verify registration OTP error:', err);
    res.status(500).json({ error: err.message || 'Server error verifying registration OTP' });
  }
});

// @route   POST /api/auth/forgot-password/send-otp
// @desc    Send OTP code to email for password reset
router.post('/forgot-password/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Please enter your email address' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Verify email exists in profiles
    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('id, restaurant_name')
      .eq('email', cleanEmail);

    if (checkError) throw checkError;
    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ error: 'No account registered with this email address' });
    }

    // 2. Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 3. Save to public.otps table
    const { error: otpError } = await supabase
      .from('otps')
      .insert([
        {
          email: cleanEmail,
          otp_code: otpCode,
          expires_at: expiresAt,
          verified: false
        }
      ]);

    if (otpError) throw otpError;

    // 4. Send Email
    const { sendOtpEmail } = require('../config/mail');
    await sendOtpEmail(cleanEmail, otpCode);

    res.json({ message: 'OTP sent successfully to your email' });
  } catch (err) {
    console.error('Send forgot password OTP error:', err);
    res.status(500).json({ error: err.message || 'Server error sending forgot password OTP' });
  }
});

// @route   POST /api/auth/forgot-password/reset
// @desc    Verify OTP and reset password
router.post('/forgot-password/reset', async (req, res) => {
  const { email, otpCode, newPassword } = req.body;

  if (!email || !otpCode || !newPassword) {
    return res.status(400).json({ error: 'Please enter all fields and OTP code' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // 1. Verify OTP code
    const { data: otpRecords, error: otpCheckError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', cleanEmail)
      .eq('otp_code', otpCode.trim())
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString());

    if (otpCheckError) throw otpCheckError;
    if (!otpRecords || otpRecords.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    const otpRecord = otpRecords[0];

    // 2. Mark OTP as verified
    const { error: otpUpdateError } = await supabase
      .from('otps')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (otpUpdateError) throw otpUpdateError;

    // 3. Find user profile ID
    const { data: profiles, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail);

    if (checkError) throw checkError;
    if (!profiles || profiles.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const profile = profiles[0];

    // 4. Update password via Supabase Auth Admin API
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(profile.id, {
      password: newPassword
    });

    if (authUpdateError) throw authUpdateError;

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Forgot password reset error:', err);
    res.status(500).json({ error: err.message || 'Server error resetting password' });
  }
});

module.exports = router;
