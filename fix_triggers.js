
const { Client } = require('pg');

const SQL = `DROP TRIGGER IF EXISTS trigger_reduce_inventory ON orders;
CREATE TRIGGER trigger_reduce_inventory
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'completed'))
  EXECUTE FUNCTION trg_reduce_inventory();

DROP TRIGGER IF EXISTS trigger_calculate_commission ON orders;
CREATE TRIGGER trigger_calculate_commission
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IN ('confirmed', 'completed'))
  EXECUTE FUNCTION trg_calculate_commission();`;

async function main() {
    // Session pooler with project reference
    const client = new Client({
        host: 'aws-0-ap-southeast-1.pooler.supabase.com',
        port: 5432,
        user: 'postgres',
        password: 'Romebois2026!',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        options: '--reference=igdesugttoafedzrxikx'
    });
    
    try {
        await client.connect();
        console.log('Connected session pooler!');
        await client.query(SQL);
        console.log('SQL executed!');
        const res = await client.query("SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE trigger_name LIKE 'trigger_%' ORDER BY trigger_name");
        res.rows.forEach(r => console.log(`  ${r.trigger_name}: ${r.event_manipulation}`));
        await client.end();
        return;
    } catch(e) {
        console.log('Session pooler:', e.message);
    }
    
    // Try transaction pooler with reference
    try {
        const client2 = new Client({
            host: 'aws-0-ap-southeast-1.pooler.supabase.com',
            port: 6543,
            user: 'postgres.igdesugttoafedzrxikx',
            password: 'Romebois2026!',
            database: 'postgres',
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        });
        await client2.connect();
        console.log('Connected transaction pooler!');
        await client2.query(SQL);
        console.log('SQL executed!');
        const res = await client2.query("SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE trigger_name LIKE 'trigger_%' ORDER BY trigger_name");
        res.rows.forEach(r => console.log(`  ${r.trigger_name}: ${r.event_manipulation}`));
        await client2.end();
    } catch(e2) {
        console.log('Transaction pooler:', e2.message);
    }
}

main();
