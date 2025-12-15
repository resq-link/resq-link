/**
 * Script to create command center accounts
 * 
 * Usage:
 * 1. Create .env file in packages/firebase/ with Firebase config
 * 2. Run: npx ts-node scripts/create-command-center.ts
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file from the packages/firebase directory
dotenv.config({ path: resolve(__dirname, '../.env') });

import { createCommandCenterAccount } from '../src/auth';

const commandCenters = [
  {
    email: 'manila@commandcenter.ph',
    password: 'Manila2024!',
    name: 'Manila Command Center',
    location: 'Manila, Philippines'
  },
  {
    email: 'quezon@commandcenter.ph',
    password: 'Quezon2024!',
    name: 'Quezon City Command Center',
    location: 'Quezon City, Philippines'
  },
  {
    email: 'makati@commandcenter.ph',
    password: 'Makati2024!',
    name: 'Makati Command Center',
    location: 'Makati, Philippines'
  }
];

async function createAllCommandCenters() {
  console.log('🚀 Creating command center accounts...\n');

  for (const center of commandCenters) {
    try {
      console.log(`Creating ${center.name}...`);
      const { user, accountData } = await createCommandCenterAccount(
        center.email,
        center.password,
        center.name,
        center.location
      );
      
      console.log(`✅ Success! Account created:`);
      console.log(`   Email: ${center.email}`);
      console.log(`   Name: ${center.name}`);
      console.log(`   Location: ${center.location}`);
      console.log(`   User ID: ${user.uid}\n`);
    } catch (error: any) {
      if (error.message.includes('email-already-in-use')) {
        console.log(`⚠️  Account already exists: ${center.email}\n`);
      } else {
        console.error(`❌ Error creating ${center.name}:`, error.message);
        console.log('');
      }
    }
  }

  console.log('✨ Done! All command center accounts processed.');
}

// Run the script
createAllCommandCenters().catch(console.error);

