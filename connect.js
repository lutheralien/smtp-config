const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
    user: 'SDCNEW',
    password: 'SDCNEW',
    connectString: 'localhost:1521/XE',  // Change this to your database connection string
    // If you have a full connection string from your DB admin, use it here
    // Example: hostname.domain.com:1521/service_name
};

// Simple query execution
async function executeQuery(query) {
    let connection;
    try {
        // Get connection
        connection = await oracledb.getConnection(dbConfig);
        console.log("Successfully connected to Oracle Database");
        
        // Execute query
        const result = await connection.execute(query);
        return result;
        
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

// Example usage function
async function runExample() {
    try {
        const result = await executeQuery("SELECT * FROM your_table");
        console.log("Query Result: ", result);
    } catch (err) {
        console.error("Failed to execute query: ", err);
    }
}

module.exports = {
    executeQuery,
    runExample
};