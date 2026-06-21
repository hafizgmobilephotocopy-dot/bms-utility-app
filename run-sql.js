const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const regions = [
  'aws-0-us-east-1',
  'aws-0-us-west-1',
  'aws-0-eu-central-1',
  'aws-0-eu-west-1',
  'aws-0-eu-west-2',
  'aws-0-ap-southeast-2',
  'aws-0-ap-northeast-1',
  'aws-0-ap-northeast-2',
  'aws-0-sa-east-1',
  'aws-0-ca-central-1',
];

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');

  for (const region of regions) {
    const connectionString = `postgresql://postgres.hrmjqfstpjuwxqwmagou:bSOn0VobtS27ErFB@${region}.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    
    try {
      console.log(`Trying ${region}...`);
      await client.connect();
      console.log(`✅ Connected to ${region}!`);
      
      console.log("Executing SQL schema...");
      await client.query(sql);
      console.log("✅ Schema executed successfully!");
      await client.end();
      return;
    } catch (err) {
      if (err.message && err.message.includes('not found')) {
        console.log(`❌ ${region}: Tenant not found.`);
      } else {
        console.log(`❌ ${region}: ${err.message}`);
      }
      try { await client.end(); } catch (e) {}
    }
  }
  console.log("Failed to connect on all tested regions.");
}

run();
