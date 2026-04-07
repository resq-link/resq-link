import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import { createDispatcherAccountAdmin } from '../src/admin';

const dispatchers = [
  { email: 'bfp@rescue.ph', password: 'BFP2024!', role: 'BFP' as const, fullName: 'BFP Dispatcher', designation: 'dispatcher' },
  { email: 'pnp@rescue.ph', password: 'PNP2024!', role: 'PNP' as const, fullName: 'PNP Dispatcher', designation: 'dispatcher' },
  { email: 'mdrrmo@rescue.ph', password: 'MDRRMO2024!', role: 'MDRRMO' as const, fullName: 'MDRRMO Dispatcher', designation: 'dispatcher' },
  { email: 'ambulance@rescue.ph', password: 'AMBULANCE2024!', role: 'AMBULANCE' as const, fullName: 'Ambulance Dispatcher', designation: 'dispatcher' },
  { email: 'pcg@rescue.ph', password: 'PCG2024!', role: 'PCG' as const, fullName: 'PCG Dispatcher', designation: 'dispatcher' },
] as const;

async function main() {
  for (const dispatcher of dispatchers) {
    try {
      const result = await createDispatcherAccountAdmin({
        email: dispatcher.email,
        password: dispatcher.password,
        role: dispatcher.role,
        fullName: dispatcher.fullName,
        designation: dispatcher.designation,
        teamCode: null,
        teamLabel: null,
      });
      console.log(`CREATED:${dispatcher.email}:${result.uid}`);
    } catch (error: any) {
      console.log(`ERROR:${dispatcher.email}:${error?.message || String(error)}`);
    }
  }
}

main();
