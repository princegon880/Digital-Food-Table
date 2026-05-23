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

    const activeOrders = (existingOrders || []).filter(o => o.status !== 'Cancelled');

    if (activeOrders.length > 0) {
      // Use the first active unpaid order to merge
      const activeOrder = activeOrders[0];

      // Merge items list
      const mergedItems = [...activeOrder.items];
      items.forEach(newItem => {
        const existingItem = mergedItems.find(i => (i.id && i.id === newItem.id) || i.name === newItem.name);
        if (existingItem) {
          existingItem.quantity = Number(existingItem.quantity) + Number(newItem.quantity);
        } else {
          mergedItems.push(newItem);
        }
      });

      const newTotalPrice = parseFloat(activeOrder.total_price) + parseFloat(totalPrice);

      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          items: mergedItems,
          total_price: newTotalPrice,
          status: 'Pending' // Reset status to Pending so kitchen knows new items are added
        })
        .eq('id', activeOrder.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.status(200).json(updatedOrder);
    }

    // 3. Otherwise, insert a new order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          restaurant_id: restaurant.id,
          table_number: tableNumber,
          items: items, // JSONB structure
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

module.exports = router;
