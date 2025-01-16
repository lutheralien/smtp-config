const nodemailer = require('nodemailer');

async function testEmail() {
    // Generate test account
    console.log('Creating test account...');
    const testAccount = await nodemailer.createTestAccount();
    console.log('Test account created:', testAccount.user);

    // Create reusable transporter
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });

    // Email content
    const mailOptions = {
        from: `"Test Sender" <${testAccount.user}>`,
        to: "recipient@example.com",
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