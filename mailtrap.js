const nodemailer = require('nodemailer');

async function testEmail() {
    // Generate test account
    // Create reusable transporter
    const transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        secure: false,
        auth: {
            user: "5e5cba51d98382",
            pass: "8b666f63c9a44b"
        }
    });

    // Email content
    const mailOptions = {
        from: `"Test Sender" <"5e5cba51d98382>`,
        to: "yelof71520@downlor.com",
        subject: "Test Email ✔",
        text: "This is a test email from Ethereal",
        html: "<b>This is a test email from Ethereal</b>", // Optional HTML version
    };

    try {
        // Send mail
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Message sent successfully!');
        console.log('Message ID:', info.messageId);
        
        // Preview URL
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
        
    } catch (error) {
        console.error('Error occurred:', error);
    }
}

// Run the test
testEmail().catch(console.error);