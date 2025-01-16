const oracledb = require('oracledb');

// Set output format to OBJECT
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Database configuration
const dbConfig = {
    user: 'classic',
    password: 'CLASSIC',
    connectString: 'localhost:1521/HOMECAREPDB'
};

// Format the result into clean JSON
function formatResult(result) {
    if (!result.rows || result.rows.length === 0) {
        return [];
    }
    
    return result.rows.map(row => {
        // Convert any special data types if needed
        const formattedRow = {};
        for (let key in row) {
            // Handle NULL values
            if (row[key] === null) {
                formattedRow[key] = null;
                continue;
            }
            
            // Handle dates
            if (row[key] instanceof Date) {
                formattedRow[key] = row[key].toISOString();
                continue;
            }
            
            // Regular values
            formattedRow[key] = row[key];
        }
        return formattedRow;
    });
}

// Simple query execution
async function executeQuery(query) {
    let connection;
    try {
        // Get connection
        connection = await oracledb.getConnection(dbConfig);
        console.log("Successfully connected to Oracle Database");
        
        // Execute query with OBJECT format
        const result = await connection.execute(query, [], {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        });
        
        // Format and return the results
        const formattedResults = formatResult(result);
        return formattedResults;
        
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
        const result = await executeQuery("SELECT * FROM EMAILS");
        // Pretty print the JSON result
        console.log("Query Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Failed to execute query: ", err);
    }
}

runExample();

module.exports = {
    executeQuery,
    runExample
};