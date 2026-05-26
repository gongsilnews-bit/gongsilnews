const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aijfktzqtnwhfotfwcka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpamZrdHpxdG53aGZvdGZ3Y2thIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY4ODY3NywiZXhwIjoyMDkxMjY0Njc3fQ.LAjlpvT8Tl6QZ9Ja3A-388FE9fZxtTOxC0otjRDq_yM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('vacancies')
    .select('id, building_name, property_type, deposit, sido, sigungu, dong')
    .eq('trade_type', '경매');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const propertyTypes = {};
  const regions = {};
  let totalDeposit = 0;

  data.forEach(p => {
    propertyTypes[p.property_type] = (propertyTypes[p.property_type] || 0) + 1;
    const regKey = `${p.sido} ${p.sigungu}`;
    regions[regKey] = (regions[regKey] || 0) + 1;
    totalDeposit += (p.deposit || 0);
  });

  console.log('SUMMARY:');
  console.log('Total Count:', data.length);
  console.log('Property Types:', propertyTypes);
  console.log('Top Regions:', Object.entries(regions).sort((a,b) => b[1]-a[1]).slice(0, 5));
  console.log('Average Appraisal Price (deposit):', Math.round(totalDeposit / data.length), '만 원');
}

run();
