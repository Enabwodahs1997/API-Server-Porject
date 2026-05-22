import readline from 'readline';
import { Pool } from 'pg';
import { databaseUrl } from './config.js';

const pool = new Pool({ connectionString: databaseUrl });

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

async function main() {
  try {
    const res = await pool.query('SELECT id, username FROM users WHERE username <> $1 ORDER BY id', ['demo']);

    if (!res.rows || res.rows.length === 0) {
      console.log('No users found besides "demo". Nothing to delete.');
      await pool.end();
      return;
    }

    console.log('Users that will be deleted (cards owned by these users will also be removed):');
    res.rows.forEach((r) => console.log(`- ${r.id}: ${r.username}`));

    const answer = await prompt('Proceed and delete these users? Type YES to confirm: ');
    if (answer !== 'YES') {
      console.log('Aborted. No changes made.');
      await pool.end();
      return;
    }

    const del = await pool.query('DELETE FROM users WHERE username <> $1 RETURNING id, username', ['demo']);
    console.log(`Deleted ${del.rowCount} user(s).`);
    del.rows.forEach((r) => console.log(`- ${r.id}: ${r.username}`));

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message || err);
    try { await pool.end(); } catch (e) {}
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('clearUsers.js')) {
  main();
}
