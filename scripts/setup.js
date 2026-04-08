const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('-----------------------------------');
console.log('🛠️  BidVault Database Setup Tool ');
console.log('-----------------------------------');

async function runSetup() {
    try {
        console.log('⏳ Connecting to MySQL server...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true 
        });

        console.log('✅ Connected.');

        const schemaPath = path.join(__dirname, '../models/db.schema.sql');
        console.log(`⏳ Reading schema file from: ${schemaPath}`);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error('db.schema.sql not found! Please ensure it exists in the models folder.');
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('⏳ Executing schema build... This might take a few seconds.');
        await connection.query(schemaSql);

        console.log('✅ Database schema created successfully!');
        console.log('🚀 You are now ready to run: npm run dev');
        process.exit(0);

    } catch (error) {
        console.error('❌ SETUP FAILED:');
        console.error(error.message);
        console.error('\nPlease double check your .env file credentials.');
        process.exit(1);
    }
}

runSetup();
