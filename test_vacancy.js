const { getVacancies } = require('./src/app/actions/vacancy');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const res = await getVacancies();
  console.log(JSON.stringify(res, null, 2));
}

test();
