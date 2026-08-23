import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

import { createDispatcherAccountAdmin } from '../src/admin';

/** Agency mobile-app accounts (responders), not web dispatchers. */
const responders = [
  { email: 'bfp@rescue.ph', password: 'BFP2024!', role: 'BFP' as const, fullName: 'BFP Responder' },
  { email: 'pnp@rescue.ph', password: 'PNP2024!', role: 'PNP' as const, fullName: 'PNP Responder' },
  { email: 'mdrrmo@rescue.ph', password: 'MDRRMO2024!', role: 'MDRRMO' as const, fullName: 'MDRRMO Responder' },
  { email: 'ambulance@rescue.ph', password: 'AMBULANCE2024!', role: 'AMBULANCE' as const, fullName: 'Ambulance Responder' },
  { email: 'pcg@rescue.ph', password: 'PCG2024!', role: 'PCG' as const, fullName: 'PCG Responder' },
  { email: 'ems@rescue.ph', password: 'EMS2024!', role: 'AMBULANCE' as const, fullName: 'EMS Responder' },
  { email: 'hospital@rescue.ph', password: 'HOSPITAL2024!', role: 'AMBULANCE' as const, fullName: 'Hospital Responder' },
] as const;

async function main() {
  for (const responder of responders) {
    try {
      const result = await createDispatcherAccountAdmin({
        email: responder.email,
        password: responder.password,
        role: responder.role,
        fullName: responder.fullName,
        designation: 'responder',
        teamCode: null,
        teamLabel: null,
      });
      console.log(`CREATED:${responder.email}:${result.uid}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`ERROR:${responder.email}:${message}`);
    }
  }
}

main();
