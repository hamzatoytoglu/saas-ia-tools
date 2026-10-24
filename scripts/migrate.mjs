// Script d'application des migrations via l'API REST Postgres de Supabase (rpc impossible pour DDL).
// Recommandé : coller db/migrations.sql dans le SQL Editor de Supabase.
// Ce script tente aussi une exécution locale via psql si DATABASE_URL est défini.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const sql = fs.readFileSync(new URL('../db/migrations.sql', import.meta.url), 'utf8');

if (process.env.DATABASE_URL) {
  execSync(`psql "${process.env.DATABASE_URL}" -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  console.log('✅ Migrations appliquées via psql');
} else {
  console.log('⚠️  Définissez DATABASE_URL (Supabase → Settings → Database → Connection string)');
  console.log('   ou appliquez db/migrations.sql manuellement via le SQL Editor de Supabase.');
}
