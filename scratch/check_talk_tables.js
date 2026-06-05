const fs = require('fs');
const path = require('path');

// Read env variables
const envPath = path.join(__dirname, '..', '.env.local');
const dotenvVars = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  if (line.includes('=')) {
    const parts = line.split('=');
    acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(dotenvVars.NEXT_PUBLIC_SUPABASE_URL, dotenvVars.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking talk_rooms table...");
  const { data: rooms, error: roomErr } = await supabase.from('talk_rooms').select('*').limit(1);
  if (roomErr) {
    console.error('Error with talk_rooms:', roomErr);
  } else if (rooms && rooms.length > 0) {
    console.log('talk_rooms columns:', Object.keys(rooms[0]));
  } else {
    console.log('talk_rooms exists but is empty or has no data returned.');
  }

  console.log("Checking talk_messages table...");
  const { data: messages, error: msgErr } = await supabase.from('talk_messages').select('*').limit(1);
  if (msgErr) {
    console.error('Error with talk_messages:', msgErr);
  } else if (messages && messages.length > 0) {
    console.log('talk_messages columns:', Object.keys(messages[0]));
  } else {
    console.log('talk_messages exists but is empty or has no data returned.');
  }
  
  console.log("Checking site_inquiries table...");
  const { data: inquiries, error: inqErr } = await supabase.from('site_inquiries').select('*').limit(1);
  if (inqErr) {
     console.error('Error with site_inquiries:', inqErr);
  } else if (inquiries && inquiries.length > 0) {
     console.log('site_inquiries columns:', Object.keys(inquiries[0]));
  } else {
     console.log('site_inquiries exists but is empty.');
  }
}

check();
