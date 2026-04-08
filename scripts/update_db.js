const mysql = require('mysql2/promise');
require('dotenv').config();

async function update() {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'auction_db'
        });

        const [result] = await conn.query(`
            UPDATE auction_items 
            SET starting_price = 1200000, 
                current_price = 1200000, 
                image_url = '/uploads/honda_civic.png' 
            WHERE title LIKE '%Civic%'
        `);
        
        console.log("DB Updated successfully. Rows matched: " + result.affectedRows);
        process.exit(0);
    } catch (e) {
        console.error("DB Error: ", e);
        process.exit(1);
    }
}
update();
