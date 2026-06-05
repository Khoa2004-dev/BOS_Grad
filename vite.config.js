import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { neon } from '@neondatabase/serverless'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'api-rsvp-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/rsvp' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  const { memberId, memberName, attending, message } = JSON.parse(body);

                  if (!memberId || !memberName || !attending) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields (memberId, memberName, attending)' }));
                    return;
                  }

                  const dbUrl = env.DATABASE_URL;
                  if (!dbUrl) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'DATABASE_URL environment variable is missing' }));
                    return;
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

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, message: 'RSVP saved successfully!' }));
                } catch (error) {
                  console.error('Local API Error:', error);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: error.message || 'Failed to save RSVP locally' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
  };
})
