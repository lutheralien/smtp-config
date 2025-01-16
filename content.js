const oracledb = require('oracledb');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;
const handlebars = require('handlebars');

// Email configuration
const emailConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-specific-password'
    }
};

// Database configuration
const dbConfig = {
    user: 'classic',
    password: 'CLASSIC',
    connectString: 'localhost:1521/HOMECAREPDB'
};

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Email templates object
const emailTemplates = {
    'STATEMENT_TEMPLATE': {
        subject: 'Your Statement for Account {{ACCOUNTNUM}}',
        html: `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .header { color: #333; margin-bottom: 20px; }
                    .content { margin: 20px 0; }
                    .footer { color: #666; font-size: 0.9em; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Statement Notification</h2>
                </div>
                <div class="content">
                    <p>Dear {{ACCOUNTNAME}},</p>
                    <p>Please find attached your statement for account number {{ACCOUNTNUM}}.</p>
                    <p>Statement Details:</p>
                    <ul>
                        <li>Account Number: {{ACCOUNTNUM}}</li>
                        <li>Customer Number: {{CUSTOMER_NUMBER}}</li>
                        <li>Date: {{formatDate TIMESTAMP}}</li>
                    </ul>
                    <p>If you have any questions, please don't hesitate to contact us.</p>
                </div>
                <div class="footer">
                    <p>Best regards,<br>Your Company Name</p>
                    <small>This is an automated message, please do not reply directly to this email.</small>
                </div>
            </body>
            </html>
        `
    },
    // Add more templates as needed
    'REMINDER_TEMPLATE': {
        subject: 'Payment Reminder for Account {{ACCOUNTNUM}}',
        html: `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .header { color: #333; margin-bottom: 20px; }
                    .content { margin: 20px 0; }
                    .footer { color: #666; font-size: 0.9em; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Payment Reminder</h2>
                </div>
                <div class="content">
                    <p>Dear {{ACCOUNTNAME}},</p>
                    <p>This is a friendly reminder about your account {{ACCOUNTNUM}}.</p>
                    <p>Please find the attached statement for your reference.</p>
                    <p>Account Details:</p>
                    <ul>
                        <li>Account Number: {{ACCOUNTNUM}}</li>
                        <li>Customer Number: {{CUSTOMER_NUMBER}}</li>
                        <li>Date: {{formatDate TIMESTAMP}}</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Best regards,<br>Your Company Name</p>
                    <small>This is an automated message, please do not reply directly to this email.</small>
                </div>
            </body>
            </html>
        `
    }
};

// Register Handlebars helpers
handlebars.registerHelper('formatDate', function(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
});

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Format database results
function formatResult(result) {
    if (!result.rows || result.rows.length === 0) {
        return [];
    }
    
    return result.rows.map(row => {
        const formattedRow = {};
        for (let key in row) {
            if (row[key] === null) {
                formattedRow[key] = null;
                continue;
            }
            
            if (row[key] instanceof Date) {
                formattedRow[key] = row[key].toISOString();
                continue;
            }
            
            formattedRow[key] = row[key];
        }
        return formattedRow;
    });
}

// Update email status in database
async function updateEmailStatus(connection, id, status) {
    try {
        await connection.execute(
            `UPDATE EMAILS SET SENT = :status WHERE ID = :id`,
            { status, id },
            { autoCommit: true }
        );
        console.log(`Updated status for ID ${id} to ${status}`);
    } catch (err) {
        console.error(`Failed to update status for ID ${id}:`, err);
        throw err;
    }
}

// Compile email template
function compileTemplate(templateName, data) {
    const template = emailTemplates[templateName];
    if (!template) {
        throw new Error(`Template ${templateName} not found`);
    }

    const compiledSubject = handlebars.compile(template.subject)(data);
    const compiledHtml = handlebars.compile(template.html)(data);

    return {
        subject: compiledSubject,
        html: compiledHtml
    };
}

// Send email with attachment
async function sendEmail(emailData) {
    try {
        const attachmentPath = path.join(emailData.ATTACHMENT_PATH, emailData.ATTACHMENT_NAME);
        const attachment = await fs.readFile(attachmentPath);

        // Compile template with email data
        const template = compileTemplate(emailData.TEMPLATE, emailData);

        const mailOptions = {
            from: emailConfig.auth.user,
            to: emailData.EMAIL,
            subject: template.subject,
            html: template.html,
            attachments: [{
                filename: emailData.ATTACHMENT_NAME,
                content: attachment
            }]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${emailData.EMAIL}: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`Failed to send email to ${emailData.EMAIL}:`, err);
        return false;
    }
}

// Process emails
async function processEmails() {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log("Successfully connected to Oracle Database");

        // Get unsent emails
        const result = await connection.execute(
            `SELECT * FROM EMAILS WHERE SENT = 'NO'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const emails = formatResult(result);
        console.log(`Found ${emails.length} unsent emails`);

        // Process each email
        for (const email of emails) {
            try {
                const success = await sendEmail(email);
                await updateEmailStatus(connection, email.ID, success ? 'YES' : 'NO');
            } catch (err) {
                console.error(`Error processing email ID ${email.ID}:`, err);
            }
        }

    } catch (err) {
        console.error("Error: ", err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection: ", err);
            }
        }
    }
}

// Run the process
async function runEmailProcess() {
    try {
        await processEmails();
        console.log("Email processing completed");
    } catch (err) {
        console.error("Failed to process emails: ", err);
    }
}

// Export functions for use in other modules
module.exports = {
    processEmails,
    runEmailProcess,
    emailTemplates
};

// Run if called directly
if (require.main === module) {
    runEmailProcess();
}