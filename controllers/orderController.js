const Order = require('../models/Order');

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
            orderId, // Optional, will be auto-generated if not provided
            customerName,
            customerEmail,
            productName,
            quantity,
            expectedDelivery,
            price: price || 0,
            paymentStatus: paymentStatus || 'Pending' // Default to Pending if not provided
        });

        await order.save();

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
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

        // Search Filter
        if (search) {
            query.$or = [
                { orderId: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } },
                { productName: { $regex: search, $options: 'i' } }
            ];
        }

        // Status Filter
        if (status) query.status = status;

        // Payment Status Filter
        if (paymentStatus) query.paymentStatus = paymentStatus;

        // Sorting Logic
        let sortOption = { createdAt: -1 }; // Default
        if (sort === 'rating') {
            sortOption = { rating: -1 }; // Highest rating first
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
 * Update order status (Admin only)
 */
const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure env vars are loaded

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Log email configuration (do not log password)
console.log('Email User configured:', process.env.EMAIL_USER);

/**
 * Temporary Test Email Route
 */
const sendTestEmail = async (req, res) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'Test Email from Order System',
            text: 'If you receive this, Nodemailer is configured correctly.'
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Test Email Error:', error);
                return res.status(500).json({ success: false, error: error.message });
            }
            console.log('Test Email Sent:', info.response);
            res.status(200).json({ success: true, message: 'Test email sent successfully' });
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

        console.log(`Updating Order ${orderId}. New Status: ${status}`);

        const order = await Order.findOne({ orderId: orderId.toUpperCase() });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const oldStatus = order.status;
        console.log(`Old Status: ${oldStatus}, New Status: ${status}`);

        // Update fields if provided
        if (status) {
            order.status = status;
            // Track History
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

        // Check availability of email credentials
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            // Send email if status changed OR if it was "Out for Delivery" and delivery details were updated
            const statusChanged = status && status !== oldStatus;
            const deliveryDetailsUpdated = status === 'Out for Delivery' && (deliveryPersonPhone !== undefined || estimatedDeliveryTime !== undefined);

            if (statusChanged || deliveryDetailsUpdated) {
                console.log('Sending update email notification...');
                console.log(`Sending email to: ${order.customerEmail}`);

                if (!order.customerEmail) {
                    console.warn('WARNING: Customer email is missing!');
                }

                let emailText = `Hello ${order.customerName},

We have an update regarding your order.

Order ID: ${order.orderId}
Product: ${order.productName}
Current Status: ${order.status}
Payment Status: ${order.paymentStatus || 'Pending'}

Expected Delivery Date: ${new Date(order.expectedDelivery).toDateString()}`;

                if (order.status === 'Out for Delivery') {
                    if (order.deliveryPersonPhone) {
                        emailText += `\nDelivery Person Phone: ${order.deliveryPersonPhone}`;
                    }
                    if (order.estimatedDeliveryTime) {
                        emailText += `\nEstimated Delivery Time: ${order.estimatedDeliveryTime}`;
                    }
                }

                emailText += `\n\nThank you for shopping with us.
If you have any questions, feel free to contact our support team.`;

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: order.customerEmail,
                    subject: `Update on your Order ${order.orderId}`,
                    text: emailText
                };

                // Send email asynchronously without blocking response
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error sending email:', error);
                    } else {
                        console.log('Update email sent successfully:', info.response);
                    }
                });
            } else {
                console.log('No significant change detected. Skipping email notification.');
            }
        } else {
            console.log('Email credentials not set. Skipping email notification.');
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

        // Security check
        if (order.customerEmail !== req.user.email) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        // Smart Cancellation Logic
        if (!['Order Placed', 'Confirmed'].includes(order.status)) {
            return res.status(400).json({
                success: false,
                message: 'Order cannot be cancelled after shipping.'
            });
        }

        order.status = 'Cancelled';

        // Update History
        order.orderHistory.push({
            status: 'Cancelled',
            updatedAt: new Date(),
            updatedBy: req.user._id
        });

        await order.save();
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
        order.feedback = review; // Map review to feedback field in schema
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
