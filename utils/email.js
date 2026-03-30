const nodemailer = require('nodemailer');

/**
 * Configure email transporter for Brevo SMTP
 */
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // TLS
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
        console.error('Brevo SMTP Connection Error:', error);
    } else {
        console.log('Brevo SMTP Server is ready to take messages');
    }
});

/**
 * Send order notification email
 * @param {Object} order - Order object from database
 * @param {String} status - Current order status
 */
const sendOrderEmail = async (order, status) => {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
        console.warn('Email credentials not set. Skipping email notification.');
        return;
    }

    if (!order.customerEmail) {
        console.warn('Customer email missing for order:', order.orderId);
        return;
    }

    const emailText = `Hello ${order.customerName},

Your order ${order.orderId} status has been updated.

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
        from: `"MS Orders" <ordertracking.notify19@gmail.com>`,
        to: order.customerEmail,
        subject: `Order ${order.orderId} Status Update: ${status}`,
        text: emailText
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${order.customerEmail}:`, info.response);
        return info;
    } catch (error) {
        console.error(`EMAIL ERROR for ${order.customerEmail}:`, error);
        throw error;
    }
};

module.exports = { sendOrderEmail, transporter };
