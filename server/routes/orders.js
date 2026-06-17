const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const requireAuth = require('../middleware/auth');

// @route   GET /api/orders
// @desc    Get all orders for the authenticated restaurant
// @access  Private
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(orders);
  } catch (err) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// @route   POST /api/orders
// @desc    Submit a new customer order (Public)
// @access  Public
router.post('/', async (req, res) => {
  const { restaurantSlug, tableNumber, items, totalPrice } = req.body;

  if (!restaurantSlug || !tableNumber || !items || !items.length || totalPrice === undefined) {
    return res.status(400).json({ error: 'Please provide restaurant slug, table number, items, and total price' });
  }

  try {
    // 1. Fetch restaurant ID from slug
    const { data: restaurant, error: restError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('slug', restaurantSlug.trim())
      .single();

    if (restError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // 2. Check if there is an existing active unpaid order for this table
    const { data: existingOrders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', tableNumber.toString().trim())
      .eq('payment_status', 'Unpaid');

    if (findError) {
      console.error('Error finding existing orders:', findError);
    }

    const isToday = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      const t = new Date();
      return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
    };

    const activeOrders = (existingOrders || []).filter(o => o.status !== 'Cancelled' && isToday(o.created_at));

    if (activeOrders.length > 0) {
      // Use the first active unpaid order to merge
      const activeOrder = activeOrders[0];

      // Calculate the next batch number
      const nextBatchNum = Math.max(...activeOrder.items.map(i => i.batch || 1), 0) + 1;

      // Add batch metadata to the new items
      const newItemsWithBatch = items.map(item => ({
        ...item,
        batch: nextBatchNum,
        ordered_at: new Date().toISOString()
      }));

      // Append items as a new batch section instead of merging quantities
      const mergedItems = [...activeOrder.items, ...newItemsWithBatch];
      const newTotalPrice = parseFloat(activeOrder.total_price) + parseFloat(totalPrice);

      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          items: mergedItems,
          total_price: newTotalPrice,
          status: 'Pending', // Reset status to Pending so kitchen knows new items are added
          created_at: new Date().toISOString() // Refresh timestamp to now so it registers as new kitchen queue addition today
        })
        .eq('id', activeOrder.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.status(200).json(updatedOrder);
    }

    // 3. Otherwise, insert a new order
    const itemsWithBatch = items.map(item => ({
      ...item,
      batch: 1,
      ordered_at: new Date().toISOString()
    }));

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          restaurant_id: restaurant.id,
          table_number: tableNumber,
          items: itemsWithBatch, // JSONB structure
          total_price: parseFloat(totalPrice),
          status: 'Pending',
          payment_status: 'Unpaid',
          payment_method: null
        }
      ])
      .select()
      .single();

    if (orderError) throw orderError;
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Submit order error:', err);
    res.status(500).json({ error: err.message || 'Failed to submit order' });
  }
});

// @route   GET /api/orders/occupied
// @desc    Get all occupied tables today for a restaurant slug
// @access  Public (called by customer to see occupied tables)
// @query   slug
router.get('/occupied', async (req, res) => {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'slug is required' });
  }

  try {
    // Resolve restaurant from slug
    const { data: restaurant, error: restError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('slug', slug.trim())
      .single();

    if (restError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check for active unpaid orders on all tables today
    const { data: existingOrders, error: findError } = await supabase
      .from('orders')
      .select('table_number, status, created_at')
      .eq('restaurant_id', restaurant.id)
      .eq('payment_status', 'Unpaid');

    if (findError) throw findError;

    const isToday = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      const t = new Date();
      return d.getDate() === t.getDate() &&
             d.getMonth() === t.getMonth() &&
             d.getFullYear() === t.getFullYear();
    };

    const activeOrders = (existingOrders || []).filter(
      o => o.status !== 'Cancelled' && isToday(o.created_at)
    );

    // Unique table numbers that are occupied
    const occupiedTables = [...new Set(activeOrders.map(o => o.table_number.toString().trim()))];

    res.json({ occupiedTables });
  } catch (err) {
    console.error('Fetch occupied tables error:', err);
    res.json({ occupiedTables: [] });
  }
});

// @route   GET /api/orders/check-table
// @desc    Check if a table is currently occupied (has active unpaid order today)
// @access  Public (called by customer before table change)
// @query   slug, table
router.get('/check-table', async (req, res) => {
  const { slug, table } = req.query;

  if (!slug || !table) {
    return res.status(400).json({ error: 'slug and table are required' });
  }

  try {
    // Resolve restaurant from slug
    const { data: restaurant, error: restError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('slug', slug.trim())
      .single();

    if (restError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check for active unpaid orders on that table today
    const { data: existingOrders, error: findError } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('restaurant_id', restaurant.id)
      .eq('table_number', table.toString().trim())
      .eq('payment_status', 'Unpaid');

    if (findError) throw findError;

    const isToday = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      const t = new Date();
      return d.getDate() === t.getDate() &&
             d.getMonth() === t.getMonth() &&
             d.getFullYear() === t.getFullYear();
    };

    const activeOrders = (existingOrders || []).filter(
      o => o.status !== 'Cancelled' && isToday(o.created_at)
    );

    res.json({ occupied: activeOrders.length > 0 });
  } catch (err) {
    console.error('Check table error:', err);
    // Fail open — don't block the customer if the check itself errors
    res.json({ occupied: false });
  }
});



// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', requireAuth, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['Pending', 'Preparing', 'Completed', 'Cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // 1. Verify ownership of order
    const { data: order, error: checkError } = await supabase
      .from('orders')
      .select('restaurant_id')
      .eq('id', orderId)
      .single();

    if (checkError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this order' });
    }

    // 2. Update status
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json(updatedOrder);
  } catch (err) {
    console.error('Update order status error:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// @route   PUT /api/orders/:id/payment
// @desc    Update order payment status and method
// @access  Private
router.put('/:id/payment', requireAuth, async (req, res) => {
  const orderId = req.params.id;
  const { paymentStatus, paymentMethod } = req.body;

  if (!paymentStatus) {
    return res.status(400).json({ error: 'paymentStatus is required' });
  }

  const validStatuses = ['Unpaid', 'Paid'];
  if (!validStatuses.includes(paymentStatus)) {
    return res.status(400).json({ error: 'Invalid paymentStatus' });
  }

  const validMethods = ['Cash', 'UPI', 'Card', null];
  if (paymentMethod !== undefined && !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid paymentMethod' });
  }

  try {
    // 1. Verify ownership of order
    const { data: order, error: checkError } = await supabase
      .from('orders')
      .select('restaurant_id')
      .eq('id', orderId)
      .single();

    if (checkError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.restaurant_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to modify this order' });
    }

    // 2. Update payment details
    const updatePayload = {
      payment_status: paymentStatus,
      payment_method: paymentStatus === 'Paid' ? paymentMethod : null
    };

    // Mark order status as Completed when billed (Paid)
    if (paymentStatus === 'Paid') {
      updatePayload.status = 'Completed';
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json(updatedOrder);
  } catch (err) {
    console.error('Update order payment error:', err);
    res.status(500).json({ error: 'Failed to update order payment' });
  }
});

// @route   GET /api/orders/analytics
// @desc    Get per-dish sales analytics (day / month / year / all-time)
// @access  Private
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const { data: allOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', req.user.id);

    if (error) throw error;

    // Exclude cancelled orders in JS — avoids relying on .neq() in mock DB
    const orders = (allOrders || []).filter(o => o.status !== 'Cancelled');

    const now = new Date();
    const todayStr = now.toDateString();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Accumulate per-dish stats and summary revenue
    const dishMap = {};
    let totalRevenueToday = 0;
    let totalRevenueMonth = 0;
    let totalRevenueYear = 0;
    let totalRevenueAllTime = 0;

    orders.forEach(order => {
      const orderDate = order.created_at ? new Date(order.created_at) : null;
      const isToday = orderDate && orderDate.toDateString() === todayStr;
      const isMonth = orderDate && orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear;
      const isYear  = orderDate && orderDate.getFullYear() === thisYear;

      const orderTotal = parseFloat(order.total_price) || 0;
      totalRevenueAllTime += orderTotal;
      if (isToday) totalRevenueToday += orderTotal;
      if (isMonth) totalRevenueMonth += orderTotal;
      if (isYear)  totalRevenueYear += orderTotal;

      (order.items || []).forEach(item => {
        const key         = (item.name || 'Unknown').trim().toLowerCase();
        const displayName = (item.name || 'Unknown').trim();
        const qty         = parseInt(item.quantity, 10) || 1;
        const price       = parseFloat(item.price) || 0;

        if (!dishMap[key]) {
          dishMap[key] = {
            name: displayName,
            totalQty: 0,
            dailyQty: 0,
            monthlyQty: 0,
            yearlyQty: 0,
            totalRevenue: 0,
            orderCount: 0
          };
        }

        dishMap[key].totalQty     += qty;
        dishMap[key].totalRevenue += qty * price;
        dishMap[key].orderCount   += 1;
        if (isToday) dishMap[key].dailyQty   += qty;
        if (isMonth) dishMap[key].monthlyQty += qty;
        if (isYear)  dishMap[key].yearlyQty  += qty;
      });
    });

    // Build summary totals
    const dishes = Object.values(dishMap).sort((a, b) => b.totalQty - a.totalQty);

    const summary = {
      uniqueDishes:        dishes.length,
      totalSoldToday:      dishes.reduce((s, d) => s + d.dailyQty,    0),
      totalSoldMonth:      dishes.reduce((s, d) => s + d.monthlyQty,  0),
      totalSoldYear:       dishes.reduce((s, d) => s + d.yearlyQty,   0),
      totalSoldAllTime:    dishes.reduce((s, d) => s + d.totalQty,    0),
      totalRevenueToday,
      totalRevenueMonth,
      totalRevenueYear,
      totalRevenueAllTime
    };

    res.json({ dishes, summary });
  } catch (err) {
    console.error('Fetch dish analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch dish analytics' });
  }
});

module.exports = router;
