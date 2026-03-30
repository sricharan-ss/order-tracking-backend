const Order = require('../models/Order');
const { sendOrderEmail, transporter } = require('../utils/email');

/**
 * Create a new order (Admin only)
 */
const createOrder = async (req, res) => {
    try {
        const { customerName, customerEmail, productName, quantity, expectedDelivery, orderId, paymentStatus, price } = req.body;

        // Validate required fields
        if (!customerName || !customerEmail || !productName || !quantity || !expectedDelivery || !price) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Create order
        const order = new Order({
            orderId,
            customerName,
            customerEmail,
            productName,
            quantity,
            expectedDelivery,
            price: price || 0,
            paymentStatus: paymentStatus || 'Pending'
        });

        await order.save();

        // Send confirmation email for "Order Placed"
        sendOrderEmail(order, 'Order Placed')
            .then(() => console.log(`Confirmation email sent for Order ${order.orderId}`))
            .catch(err => console.error('Initial Order Email Error:', err));

        res.status(201).json({
            success: true,
            message: 'Order created successfully and confirmation email sent',
            order
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while creating order'
        });
    }
};

/**
 * Get order by Order ID (Public)
 */
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId: orderId.toUpperCase() });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching order'
        });
    }
};

/**
 * Get all orders (Admin only) with Pagination & Filtering
 */
const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status = '', paymentStatus = '', sort = '' } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { productName: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        let sortOption = { createdAt: -1 };
        if (sort === 'rating') {
            sortOption = { rating: -1 };
        } else if (sort === 'rating_asc') {
            sortOption = { rating: 1 };
        }

        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .sort(sortOption)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        res.status(200).json({
            success: true,
            orders,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalOrders: count
        });

    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching orders'
        });
    }
};

/**
 * Temporary Test Email Route
 */
const sendTestEmail = async (req, res) => {
    try {
        const mailOptions = {
            from: `"MS Orders" <ordertracking.notify19@gmail.com>`,
            to: process.env.EMAIL_USER,
            subject: 'Test Email - Brevo SMTP',
            text: 'If you receive this, Brevo SMTP is configured correctly!'
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Test Email SMTP Error:', error);
                return res.status(500).json({ success: false, error: error.message });
            }
            res.status(200).json({ success: true, message: 'Test email sent successfully', info: info.response });
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update order status (Admin only)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, customerName, productName, quantity, expectedDelivery, paymentStatus, deliveryPersonPhone, estimatedDeliveryTime } = req.body;

        const order = await Order.findOne({ orderId: orderId.toUpperCase() });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const oldStatus = order.status;

        // Update fields
        if (status) {
            order.status = status;
            order.orderHistory.push({
                status: status,
                updatedAt: new Date(),
                updatedBy: req.user._id
            });
        }
        if (customerName) order.customerName = customerName;
        if (productName) order.productName = productName;
        if (quantity) order.quantity = quantity;
        if (expectedDelivery) order.expectedDelivery = expectedDelivery;
        if (paymentStatus) order.paymentStatus = paymentStatus;
        if (deliveryPersonPhone !== undefined) order.deliveryPersonPhone = deliveryPersonPhone;
        if (estimatedDeliveryTime !== undefined) order.estimatedDeliveryTime = estimatedDeliveryTime;
        if (req.body.price !== undefined) order.price = req.body.price;

        await order.save();

        // Email Trigger Logic - ONLY for specific statuses per user requirement
        // Statuses allowed: 'Out for Delivery', 'Delivered'
        const notifyStatuses = ['Out for Delivery', 'Delivered'];
        
        if (status && notifyStatuses.includes(status) && status !== oldStatus) {
            console.log(`Triggering email for status change: ${oldStatus} -> ${status}`);
            sendOrderEmail(order, status)
                .catch(err => console.error('Order Update Email Error:', err));
        } else {
            console.log(`Status change (${status}) does not require email notification.`);
        }

        res.status(200).json({
            success: true,
            message: 'Order updated successfully',
            order
        });

    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while updating order'
        });
    }
};

/**
 * Delete order (Admin only)
 */
const deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOneAndDelete({ orderId: orderId.toUpperCase() });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Order deleted successfully'
        });

    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting order'
        });
    }
};

/**
 * Get My Orders (Customer)
 */
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customerEmail: req.user.email }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Cancel Order (Customer)
 */
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId: orderId.toUpperCase() });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.customerEmail !== req.user.email) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (!['Order Placed', 'Confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled after shipping.'
            });
        }

        order.status = 'Cancelled';
        order.orderHistory.push({
            status: 'Cancelled',
            updatedAt: new Date(),
            updatedBy: req.user._id
        });

        await order.save();
        
        // Note: The user specified "ONLY" Out for Delivery and Delivered for status updates.
        // We'll keep Cancelled emails disabled for now as per the "ONLY" keyword, 
        // unless they want to keep the existing behavior.
        
        res.status(200).json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add Rating (Customer)
 */
const addRating = async (req, res) => {
        try {
        const { orderId } = req.params;
        const { rating, review } = req.body;
        const order = await Order.findOne({ orderId: orderId.toUpperCase() });

        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.customerEmail !== req.user.email) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        if (order.status !== 'Delivered') {
            return res.status(400).json({ success: false, message: 'You can only rate delivered orders.' });
        }

        order.rating = rating;
        order.feedback = review;
        await order.save();
        res.status(200).json({ success: true, message: 'Rating added successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get Admin Stats (Aggregation)
 */
const getAdminStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const statusStats = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const revenueStats = await Order.aggregate([
            { $match: { paymentStatus: 'Paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
        ]);

        const stats = {
            totalOrders,
            delivered: statusStats.find(s => s._id === 'Delivered')?.count || 0,
            pending: statusStats.find(s => s._id === 'Order Placed' || s._id === 'Confirmed')?.count || 0,
            cancelled: statusStats.find(s => s._id === 'Cancelled')?.count || 0,
            revenue: revenueStats[0]?.totalRevenue || 0
        };
        res.status(200).json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    addRating,
    deleteOrder,
    sendTestEmail,
    getAdminStats
};
