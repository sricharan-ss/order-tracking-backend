const mongoose = require('mongoose');

/**
 * Order Schema
 * Stores all order information and tracking status
 */
const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        uppercase: true,
        trim: true,
        index: true // Portfolio enhancement
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    customerEmail: {
        type: String,
        required: [true, 'Customer email is required'],
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    productName: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    status: {
        type: String,
        enum: [
            'Order Placed',
            'Confirmed',
            'Packed',
            'Shipped',
            'Out for Delivery',
            'Delivered',
            'Cancelled'
        ],
        default: 'Order Placed'
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'COD', 'Pending'],
        default: 'Pending'
    },
    expectedDelivery: {
        type: Date,
        required: [true, 'Expected delivery date is required']
    },
    deliveryPersonPhone: {
        type: String,
        trim: true
    },
    estimatedDeliveryTime: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        default: 0,
        min: [0, 'Price must be positive']
    },
    // Portfolio Features
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: {
        type: String,
        trim: true
    },
    orderHistory: [{
        status: String,
        updatedAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

/**
 * Generate unique order ID before saving
 */
orderSchema.pre('save', async function (next) {
    if (!this.orderId) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.orderId = `ORD-${randomStr}`;

        const existingOrder = await mongoose.model('Order').findOne({ orderId: this.orderId });
        if (existingOrder) {
            const newRandomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.orderId = `ORD-${newRandomStr}`;
        }
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
