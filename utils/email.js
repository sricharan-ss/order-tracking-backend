const axios = require('axios');

/**
 * Send order notification email using Brevo REST API
 * This bypasses SMTP port restrictions on cloud platforms like Render/Vercel.
 * @param {Object} order - Order object from database
 * @param {String} status - Current order status
 */
const sendOrderEmail = async (order, status) => {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.warn('BREVO_API_KEY not set. Skipping email notification.');
        return;
    }

    if (!order.customerEmail) {
        console.warn('Customer email missing for order:', order.orderId);
        return;
    }

    const emailData = {
        sender: {
            name: "MS Orders",
            email: "ordertracking.notify19@gmail.com"
        },
        to: [
            {
                email: order.customerEmail,
                name: order.customerName
            }
        ],
        subject: `Order ${order.orderId} Update: ${status}`,
        htmlContent: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                <h2 style="color: #007bff; text-align: center;">Order Update</h2>
                <p>Hello <strong>${order.customerName}</strong>,</p>
                <p>We have an update regarding your order.</p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Product:</strong> ${order.productName}</p>
                    <p><strong>Current Status:</strong> <span style="color: #28a745; font-weight: bold;">${status}</span></p>
                    <p><strong>Expected Delivery:</strong> ${new Date(order.expectedDelivery).toDateString()}</p>
                </div>
                ${status === 'Out for Delivery' ? `
                <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-bottom: 20px; border: 1px solid #ffeeba;">
                    <p><strong>Delivery Details:</strong></p>
                    ${order.deliveryPersonPhone ? `<p>Phone: ${order.deliveryPersonPhone}</p>` : ''}
                    ${order.estimatedDeliveryTime ? `<p>Estimated Time: ${order.estimatedDeliveryTime}</p>` : ''}
                </div>` : ''}
                <p>Thank you for shopping with us!</p>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #777; text-align: center;">If you have any questions, please contact our support team.</p>
            </div>
        `
    };

    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });
        console.log(`Email API Success for ${order.customerEmail}:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Email API ERROR for ${order.customerEmail}:`, error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendOrderEmail };
