import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Write cookies to a local file in the project root
    const filePath = path.join(process.cwd(), 'session_cookies.json');
    fs.writeFileSync(filePath, JSON.stringify(allCookies, null, 2));
    
    return Response.json({ success: true, message: 'Session cookies successfully exported for the bot!' });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message });
  }
}
