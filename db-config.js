const oracledb = require('oracledb');

// Database configuration
const dbConfig = {
    user: 'SDCNEW',
    password: 'SDCNEW',
    connectString: 'localhost:1521/XE',  // format: host:port/service_name
    poolMin: 10,
    poolMax: 10,
    poolIncrement: 0
};

// Initialize and get connection
async function initialize() {
    try {
        // Set client location from config
        if (process.platform === 'win32') {
            oracledb.initOracleClient({ libDir: 'C:\\oraclexe\\instantclient_21_3' });
        }
        
        // Create connection pool
        await oracledb.createPool(dbConfig);
        console.log('Connection pool created');

        // Test the connection
        const connection = await oracledb.getConnection();
        console.log('Successfully connected to Oracle Database');
        
        // Release the connection
        await connection.close();
        
    } catch (err) {
        console.error('Error occurred:', err);
    }
}

// Close pool and exit
async function closePoolAndExit() {
    try {
        await oracledb.getPool().close(10);
        console.log('Pool closed');
        process.exit(0);
    } catch(err) {
        console.error('Error closing pool:', err);
        process.exit(1);
    }
}

// Execute query example
async function executeQuery(query) {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const result = await connection.execute(query);
        return result;
    } catch (err) {
        console.error('Error executing query:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

// Handle process exit
process.on('SIGINT', closePoolAndExit).on('SIGTERM', closePoolAndExit);

module.exports = {
    initialize,
    executeQuery,
    closePoolAndExit
};