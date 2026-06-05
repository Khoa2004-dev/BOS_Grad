import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Set CORS headers for cross-origin or local dev setups
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS requests (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { memberId, memberName, attending, message } = req.body;

    if (!memberId || !memberName || !attending) {
      return res.status(400).json({ error: 'Missing required fields (memberId, memberName, attending)' });
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'DATABASE_URL environment variable is missing' });
    }

    const sql = neon(dbUrl);

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        member_id VARCHAR(100) NOT NULL,
        member_name VARCHAR(100) NOT NULL,
        attending VARCHAR(10) NOT NULL,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Insert the RSVP
    await sql`
      INSERT INTO rsvps (member_id, member_name, attending, message)
      VALUES (${memberId}, ${memberName}, ${attending}, ${message || ''})
    `;

    return res.status(200).json({ success: true, message: 'RSVP saved successfully!' });
  } catch (error) {
    console.error('Database connection or execution error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save RSVP to the database' });
  }
}
