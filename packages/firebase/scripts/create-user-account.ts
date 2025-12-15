/**
 * Script to create a user account with phone authentication
 * 
 * Usage:
 * 1. Create .env file in packages/firebase/ with Firebase config
 * 2. Run: npx ts-node scripts/create-user-account.ts
 * 
 * Note: This requires manual code entry as SMS codes cannot be automated
 */

// Load environment variables from .env file
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env file from the packages/firebase directory
dotenv.config({ path: resolve(__dirname, '../.env') });

import { signInUserWithPhone, verifyPhoneCodeAndCreateProfile } from '../src/auth';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createUserAccount() {
  console.log('🚀 Creating user account with phone authentication...\n');

  try {
    // Get phone number
    const phoneNumber = await question('Enter phone number (E.164 format, e.g., +1234567890): ');
    
    if (!phoneNumber.startsWith('+')) {
      console.error('❌ Phone number must be in E.164 format (start with +)');
      rl.close();
      return;
    }

    // Get user details
    const fullName = await question('Enter full name: ');
    const address = await question('Enter address: ');

    console.log('\n📱 Sending verification code...');
    
    // Send verification code
    const confirmationResult = await signInUserWithPhone(phoneNumber);
    console.log('✅ Verification code sent to your phone!');

    // Get verification code
    const code = await question('\nEnter the 6-digit verification code: ');

    console.log('\n🔐 Verifying code and creating profile...');

    // Verify code and create profile
    const { user, accountData } = await verifyPhoneCodeAndCreateProfile(
      confirmationResult,
      code,
      fullName,
      address
    );

    console.log('\n✅ Success! User account created:');
    console.log(`   Phone: ${accountData.phone}`);
    console.log(`   Name: ${accountData.fullName}`);
    console.log(`   Address: ${accountData.address}`);
    console.log(`   User ID: ${user.uid}`);
    console.log('\n✨ Account stored in Firestore: users/{userId}');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('code-expired')) {
      console.log('💡 The verification code has expired. Please run the script again.');
    } else if (error.message.includes('invalid-verification-code')) {
      console.log('💡 Invalid verification code. Please check and try again.');
    }
  } finally {
    rl.close();
  }
}

// Run the script
createUserAccount().catch(console.error);

