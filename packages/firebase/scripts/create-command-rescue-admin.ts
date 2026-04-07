import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import { createCommandCenterAccountAdmin } from '../src/admin';

async function main() {
  try {
    const result = await createCommandCenterAccountAdmin({
      email: 'command@rescue.ph',
      password: 'command123',
      name: 'Command Center',
      location: 'Tuguegarao',
    });
    console.log(`CREATED:${result.uid}`);
  } catch (error: any) {
    console.log(`ERROR:${error?.message || String(error)}`);
    process.exitCode = 1;
  }
}

main();
