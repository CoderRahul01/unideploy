import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPostHogClient } from '@/lib/posthog-server';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'install.sh');
    const fileContents = fs.readFileSync(filePath, 'utf8');

    getPostHogClient().capture({
      distinctId: 'anonymous',
      event: 'install_script_fetched',
      properties: { source: 'install.sh' },
    });

    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    return new NextResponse('echo "Failed to load install script"', { status: 500 });
  }
}
