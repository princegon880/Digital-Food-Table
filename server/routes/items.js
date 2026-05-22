const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// Set up image upload folder (for local fallback)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration - use memory storage so we can process buffers
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Error: Only images are allowed (jpeg, jpg, png, webp, gif)!'));
  }
});

// Helper to upload file buffer to Supabase bucket
async function uploadToSupabaseBucket(bucketName, filename, buffer, mimetype) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, buffer, {
        contentType: mimetype,
        upsert: true
      });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

// @route   POST /api/items/upload
// @desc    Upload menu item image
// @access  Private
router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;

    // 1. Try uploading to official online Supabase Storage if available
    if (supabase.storage) {
      const bucketName = 'images';
      console.log(`Online mode detected. Attempting to upload ${uniqueFilename} to Supabase bucket '${bucketName}'...`);
      
      let uploadResult = await uploadToSupabaseBucket(bucketName, uniqueFilename, req.file.buffer, req.file.mimetype);
      
      if (uploadResult.error) {
        console.log(`Failed to upload to bucket '${bucketName}':`, uploadResult.error.message);
        console.log('Attempting to create bucket...');
        
        // Attempt to create the bucket in case it doesn't exist
        try {
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/*']
          });
          
          if (!createError) {
            console.log(`Bucket '${bucketName}' created successfully. Retrying upload...`);
            uploadResult = await uploadToSupabaseBucket(bucketName, uniqueFilename, req.file.buffer, req.file.mimetype);
          } else {
            console.error('Create bucket error:', createError.message);
          }
        } catch (bucketErr) {
          console.error('Error creating bucket:', bucketErr);
        }
      }
      
      if (!uploadResult.error) {
        const { data } = supabase.storage.from(bucketName).getPublicUrl(uniqueFilename);
        if (data && data.publicUrl) {
          console.log(`Supabase upload successful! Public URL: ${data.publicUrl}`);
          return res.json({ imageUrl: data.publicUrl });
        }
      } else {
        console.error('Supabase upload failed completely. Falling back to local file storage:', uploadResult.error);
      }
    }

    // 2. Fallback to Local storage mode (for offline development)
    console.log(`Saving ${uniqueFilename} locally to uploads folder...`);
    const localFilePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(localFilePath, req.file.buffer);

    // Build local absolute URL
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${serverUrl}/uploads/${uniqueFilename}`;

    res.json({ imageUrl });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});


// @route   GET /api/items
// @desc    Get all menu items for the authenticated restaurant
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*, categories(*)')
      .eq('restaurant_id', req.user.id);

    if (error) throw error;
    res.json(items);
  } catch (err) {
    console.error('Fetch items error:', err);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// @route   POST /api/items
// @desc    Create menu item
// @access  Private
router.post('/', requireAuth, async (req, res) => {
  const { categoryId, name, price, description, imageUrl, isVeg, isAvailable } = req.body;

  if (!categoryId || !name || price === undefined) {
    return res.status(400).json({ error: 'Please enter name, price, and category' });
  }

  try {
    // 1. Verify that category belongs to this restaurant
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('restaurant_id')
      .eq('id', categoryId)
      .single();

    if (catError || !category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized category selection' });
    }

    // 2. Insert item
    const { data: newItem, error } = await supabase
      .from('menu_items')
      .insert([
        {
          restaurant_id: req.user.id,
          category_id: categoryId,
          name,
          price: parseFloat(price),
          description: description || '',
          image_url: imageUrl || '',
          is_veg: isVeg !== undefined ? isVeg : true,
          is_available: isAvailable !== undefined ? isAvailable : true
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(newItem);
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// @route   PUT /api/items/:id
// @desc    Update menu item
// @access  Private
router.put('/:id', requireAuth, async (req, res) => {
  const { categoryId, name, price, description, imageUrl, isVeg, isAvailable } = req.body;
  const itemId = req.params.id;

  try {
    // 1. Verify item ownership
    const { data: item, error: checkError } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', itemId)
      .single();

    if (checkError || !item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (item.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this menu item' });
    }

    // 2. If changing category, verify category belongs to restaurant
    if (categoryId) {
      const { data: category, error: catError } = await supabase
        .from('categories')
        .select('restaurant_id')
        .eq('id', categoryId)
        .single();

      if (catError || !category || category.restaurant_id !== req.user.id) {
        return res.status(400).json({ error: 'Invalid category selection' });
      }
    }

    // 3. Update
    const { data: updatedItem, error: updateError } = await supabase
      .from('menu_items')
      .update({
        category_id: categoryId || undefined,
        name: name || undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        description: description !== undefined ? description : undefined,
        image_url: imageUrl !== undefined ? imageUrl : undefined,
        is_veg: isVeg !== undefined ? isVeg : undefined,
        is_available: isAvailable !== undefined ? isAvailable : undefined
      })
      .eq('id', itemId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json(updatedItem);
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete menu item
// @access  Private
router.delete('/:id', requireAuth, async (req, res) => {
  const itemId = req.params.id;

  try {
    // 1. Verify item ownership
    const { data: item, error: checkError } = await supabase
      .from('menu_items')
      .select('restaurant_id')
      .eq('id', itemId)
      .single();

    if (checkError || !item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (item.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this menu item' });
    }

    // 2. Delete
    const { error: deleteError } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) throw deleteError;
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;
