const db = require('./db-config.js');

async function main() {
    await db.initialize();
    
    // Example query
    try {
        const result = await db.executeQuery('SELECT * FROM your_table');
        console.log(result);
    } catch (err) {
        console.error(err);
    }
}

main();