const nodemailer = require('nodemailer');

// Config object from your JSON
const config = {
    host: "localhost",
    login: "SDCNEW",    
    password: "SDCNEW",
    service: "FINANCE",
    attach_path: "attach/",
    server: "smtp.office365.com",
    port: 587,
    sender: "customer.engagements@sdcgh.com",
    s_password: "$dcX0830",
    // orclpath: "C:\\oraclexe\\instantclient_21_3"
};

// Create transporter object using Office 365 settings from config
const transporter = nodemailer.createTransport({
    host: config.server,
    port: config.port,
    secure: false, // true for 465, false for 587
    auth: {
        user: config.sender,
        pass: config.s_password
    }
});

// Email options
const mailOptions = {
    from: config.sender,
    to: 'eyandilutherking2003@gmailcom', // Replace with recipient email
    subject: 'SMTP Test Email',
    text: 'If you receive this email, the SMTP configuration is working correctly!'
};

// Send email
async function sendMail() {
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
        console.log('Message ID:', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Run the test
sendMail();