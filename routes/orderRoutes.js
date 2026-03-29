const express = require('express');
const {
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
} = require('../controllers/orderController');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

/**
 * Public/Test Routes
 */
router.get('/test-email', sendTestEmail);

/**
 * Admin Only Routes
 */
router.get('/stats', auth, adminOnly, getAdminStats);
router.get('/', auth, adminOnly, getAllOrders);

/**
 * Protected Routes (Any Authenticated User)
 */
router.post('/', auth, createOrder);
router.get('/myorders', auth, getMyOrders);
router.get('/:orderId', auth, getOrderById); // Wildcard route - keep last for GETs
router.put('/:orderId/cancel', auth, cancelOrder);
router.put('/:orderId/rate', auth, addRating);

router.put('/:orderId', auth, adminOnly, updateOrderStatus); // Full update
router.delete('/:orderId', auth, adminOnly, deleteOrder);

module.exports = router;
