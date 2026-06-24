const db = require('./database');

async function migrate() {
    console.log("Running migration...");
    try {
        // Add columns if they don't exist (MySQL will error if column exists)
        const migrations = [
            `ALTER TABLE users ADD COLUMN worker_lat DOUBLE`,
            `ALTER TABLE users ADD COLUMN worker_lon DOUBLE`,
            `ALTER TABLE complaints ADD COLUMN cleanup_image_url VARCHAR(500)`,
            `ALTER TABLE complaints ADD COLUMN priority_score DOUBLE`,
            `ALTER TABLE complaints ADD COLUMN resolved_at TIMESTAMP NULL`,
            `ALTER TABLE complaints ADD COLUMN description TEXT`,
        ];

        for (const sql of migrations) {
            try {
                await db.query(sql);
                console.log(`Migration OK: ${sql.slice(0, 60)}...`);
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Column already exists, skipping: ${sql.slice(0, 60)}...`);
                } else {
                    console.warn('Migration warning:', err.message);
                }
            }
        }

        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err.message);
    }
    process.exit(0);
}

migrate();
