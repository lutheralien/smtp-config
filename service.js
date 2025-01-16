const oracledb = require('oracledb');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs').promises;

// Email configuration
const emailConfig = {
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    secure: false,
    auth: {
        user: '5e5cba51d98382',
        pass: '8b666f63c9a44b'
    }
};

// Database configuration
const dbConfig = {
    user: 'classic',
    password: 'CLASSIC',
    connectString: 'localhost:1521/HOMECAREPDB'
};

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Create email transporter
const transporter = nodemailer.createTransport(emailConfig);

// Read and process template
async function readTemplate(templatePath, data) {
    try {
        // Read template file
        let template = await fs.readFile(templatePath, 'utf8');
        
        // Replace all variables in curly braces
        template = template.replace(/\{([^}]+)\}/g, (match, variable) => {
            const cleanVariable = variable.trim();
            
            // Handle date fields
            if (cleanVariable === 'TIMESTAMP' && data[cleanVariable]) {
                const date = new Date(data[cleanVariable]);
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
            
            return data[cleanVariable] || '';
        });
        
        return template;
    } catch (err) {
        console.error(`Error reading template ${templatePath}:`, err);
        throw err;
    }
}

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

// Send email with attachment
async function sendEmail(emailData) {
    try {
        // Read attachment
        const attachmentPath = path.join(emailData.ATTACHMENT_PATH, emailData.ATTACHMENT_NAME);
        const attachment = await fs.readFile(attachmentPath);

        // Read and process template
        const emailContent = await readTemplate(emailData.TEMPLATE, emailData);

        // Split content into subject and body (first line is subject)
        const [subject, ...bodyLines] = emailContent.split('\n');

        const mailOptions = {
            from: emailConfig.auth.user,
            to: emailData.EMAIL,
            subject: subject,
            text: bodyLines.join('\n'),  // Rest of the content as email body
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
        console.log('emails', emails);
        
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
    runEmailProcess
};

// Run if called directly
if (require.main === module) {
    runEmailProcess();
}