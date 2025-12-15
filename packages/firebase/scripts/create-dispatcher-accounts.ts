/**
 * Script to create dispatcher accounts for all roles
 * 
 * Usage:
 * 1. Create .env file in packages/firebase/ with Firebase config
 * 2. Run: npx ts-node scripts/create-dispatcher-accounts.ts
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file from the packages/firebase directory
dotenv.config({ path: resolve(__dirname, '../.env') });

import { createDispatcherAccount } from '../src/auth';

const dispatchers = [
  {
    email: 'bfp@rescue.ph',
    password: 'BFP2024!',
    role: 'BFP' as const,
    name: 'Bureau of Fire Protection'
  },
  {
    email: 'pnp@rescue.ph',
    password: 'PNP2024!',
    role: 'PNP' as const,
    name: 'Philippine National Police'
  },
  {
    email: 'mdrrmo@rescue.ph',
    password: 'MDRRMO2024!',
    role: 'MDRRMO' as const,
    name: 'Municipal Disaster Risk Reduction and Management Office'
  },
  {
    email: 'ambulance@rescue.ph',
    password: 'AMBULANCE2024!',
    role: 'AMBULANCE' as const,
    name: 'Ambulance Service'
  },
  {
    email: 'pcg@rescue.ph',
    password: 'PCG2024!',
    role: 'PCG' as const,
    name: 'Philippine Coast Guard'
  }
];

async function createAllDispatchers() {
  console.log('🚀 Creating dispatcher accounts...\n');

  for (const dispatcher of dispatchers) {
    try {
      console.log(`Creating ${dispatcher.name} account (${dispatcher.role})...`);
      const { user, accountData } = await createDispatcherAccount(
        dispatcher.email,
        dispatcher.password,
        dispatcher.role
      );
      
      console.log(`✅ Success! Account created:`);
      console.log(`   Email: ${dispatcher.email}`);
      console.log(`   Role: ${dispatcher.role}`);
      console.log(`   User ID: ${user.uid}\n`);
    } catch (error: any) {
      if (error.message.includes('email-already-in-use')) {
        console.log(`⚠️  Account already exists: ${dispatcher.email}\n`);
      } else {
        console.error(`❌ Error creating ${dispatcher.name}:`, error.message);
        console.log('');
      }
    }
  }

  console.log('✨ Done! All dispatcher accounts processed.');
}

// Run the script
createAllDispatchers().catch(console.error);

