const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Generate a random token
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Create email transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'your-email@gmail.com', // Replace with your email
        pass: 'your-app-password'    // Replace with your app password
    }
});

// Send password reset email
const sendResetEmail = async (email, token) => {
    try {
        const mailOptions = {
            from: 'Nutribite <no-reply@nutribite.com>',
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="http://localhost:3000/reset-password/${token}">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending reset email:', error);
        return false;
    }
};

module.exports = {
    generateToken,
    sendResetEmail
};
