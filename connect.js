const oracledb = require('oracledb');

// Set autoCommit to true and outFormat to OBJECT
oracledb.autoCommit = true;
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const dbConfig = {
    user: 'classic',
    password: 'CLASSIC',
    connectString: 'localhost:1521/HOMECAREPDB',
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1
};

let pool;

async function initializeConnectionPool() {
    try {
        pool = await oracledb.createPool(dbConfig);
        console.log('Connection pool created');
    } catch (err) {
        console.error('Error creating connection pool: ', err);
        throw err;
    }
}

async function executeQuery(query, params = {}) {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("Successfully connected to Oracle Database");
        
        // Log the query being executed
        console.log("Executing query:", query);
        
        const options = {
            outFormat: oracledb.OUT_FORMAT_OBJECT  // Return results as objects
        };
        
        const result = await connection.execute(query, params, options);
        
        // Log the query results
        console.log("Number of rows returned:", result.rows ? result.rows.length : 0);
        console.log("Metadata:", result.metaData);
        
        if (!result.rows || result.rows.length === 0) {
            console.log("No rows returned - checking if table exists and has data");
            
            // Check if table exists and has data
            const tableCheck = await connection.execute(
                `SELECT COUNT(*) as count FROM EMAILS`,
                {},
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            console.log("Table row count:", tableCheck.rows[0].COUNT);
        }
        
        return result.rows;
    } catch (err) {
        console.error("Error executing query: ", err);
        
        // Additional error checking
        if (err.errorNum === 942) {
            console.error("Table does not exist");
        } else if (err.errorNum === 1017) {
            console.error("Invalid username/password");
        } else if (err.errorNum === 12541) {
            console.error("Cannot connect to database");
        }
        
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error releasing connection: ", err);
            }
        }
    }
}

async function runExample() {
    try {
        // First, let's check if we can see the table
        const tableQuery = `
            SELECT table_name 
            FROM user_tables 
            WHERE table_name = 'EMAILS'
        `;
        console.log("Checking if table exists...");
        const tableResult = await executeQuery(tableQuery);
        console.log("Table check result:", tableResult);

        // Now query the actual table
        const query = `
            SELECT * 
            FROM EMAILS 
            WHERE ROWNUM <= 5
        `;  // Limit to 5 rows for testing
        console.log("\nQuerying EMAILS table...");
        const result = await executeQuery(query);
        console.log("Query Result:", result);

    } catch (err) {
        console.error("Failed to execute query:", err);
    }
}

// Initialize and run
initializeConnectionPool()
    .then(() => runExample())
    .catch(err => {
        console.error('Failed to initialize connection pool or run query:', err);
    });

module.exports = {
    executeQuery,
    runExample,
};