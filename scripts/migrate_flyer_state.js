const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found!');
  process.exit(1);
}

const envText = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envText.split('\n').forEach(line => {
  const cleanLine = line.trim();
  if (cleanLine.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = cleanLine.split('=')[1].trim().replace(/['"]/g, '');
  if (cleanLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = cleanLine.split('=')[1].trim().replace(/['"]/g, '');
});

if (!supabaseUrl || !supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Fetching all flyer records...');
  const { data: flyers, error } = await supabase
    .from('vacancy_flyers')
    .select('id, vacancy_id, flyer_state');

  if (error) {
    console.error('Error fetching flyers:', error);
    return;
  }

  console.log(`Found ${flyers.length} records. Analyzing...`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const flyer of flyers) {
    const state = flyer.flyer_state;
    if (state && typeof state === 'object') {
      const isComposite = 'flyer' in state || 'report' in state;
      if (isComposite) {
        skippedCount++;
        continue;
      }
      
      // Migrate legacy state to composite format
      const newState = {
        flyer: state,
        report: null
      };

      console.log(`Migrating record ID ${flyer.id} (vacancy_id: ${flyer.vacancy_id})...`);
      const { error: updateError } = await supabase
        .from('vacancy_flyers')
        .update({ flyer_state: newState })
        .eq('id', flyer.id);

      if (updateError) {
        console.error(`Failed to update record ID ${flyer.id}:`, updateError.message);
      } else {
        migratedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\nMigration Summary:');
  console.log(`- Total processed: ${flyers.length}`);
  console.log(`- Migrated (legacy -> composite): ${migratedCount}`);
  console.log(`- Skipped (already composite or empty): ${skippedCount}`);
}

runMigration();
