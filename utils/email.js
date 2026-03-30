const nodemailer = require('nodemailer');

/**
 * Configure email transporter
 * Using 'service: gmail' is more robust for cloud platforms like Render/Vercel
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Verify transporter connection on startup
 */
transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP Connection Error:', error);
    } else {
        console.log('SMTP Server is ready to take messages');
    }
});

/**
 * Send order notification email
 * @param {Object} order - Order object from database
 * @param {String} status - Current order status
 */
const sendOrderEmail = async (order, status) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not set. Skipping email notification.');
        return;
    }

    if (!order.customerEmail) {
        console.warn('Customer email missing for order:', order.orderId);
        return;
    }

    const emailText = `Hello ${order.customerName},

We have an update regarding your order.

Order ID: ${order.orderId}
Product: ${order.productName}
Current Status: ${status}
Payment Status: ${order.paymentStatus || 'Pending'}

Expected Delivery Date: ${new Date(order.expectedDelivery).toDateString()}

${status === 'Out for Delivery' ? 
    (order.deliveryPersonPhone ? `\nDelivery Person Phone: ${order.deliveryPersonPhone}` : '') +
    (order.estimatedDeliveryTime ? `\nEstimated Delivery Time: ${order.estimatedDeliveryTime}` : '') : ''}

Thank you for shopping with us.
If you have any questions, feel free to contact our support team.`;

    const mailOptions = {
        from: `Order Tracking <${process.env.EMAIL_USER}>`,
        to: order.customerEmail,
        subject: `Update on your Order ${order.orderId} - ${status}`,
        text: emailText
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${order.customerEmail}:`, info.response);
        return info;
    } catch (error) {
        console.error(`Error sending email to ${order.customerEmail}:`, error);
        throw error;
    }
};

module.exports = { sendOrderEmail, transporter };
