#!/usr/bin/env node

import { MigrationRunner } from '../src/lib/migration-runner';
import { DatabaseSeeder } from '../src/lib/seed-data';
import { DatabaseUtils } from '../src/lib/db-utils';

async function setupDatabase() {
  console.log('🚀 Starting LogosLMS Database Setup...\n');

  try {
    // Step 1: Run migrations
    console.log('📋 Step 1: Running database migrations...');
    const migrationRunner = new MigrationRunner();
    const migrationSuccess = await migrationRunner.runMigrations();
    
    if (!migrationSuccess) {
      console.error('❌ Database migrations failed');
      process.exit(1);
    }
    console.log('✅ Database migrations completed successfully\n');

    // Step 2: Seed initial data
    console.log('🌱 Step 2: Seeding initial data...');
    const seedSuccess = await DatabaseSeeder.seedDatabase();
    
    if (!seedSuccess) {
      console.error('❌ Database seeding failed');
      process.exit(1);
    }
    console.log('✅ Database seeding completed successfully\n');

    // Step 3: Verify setup
    console.log('🔍 Step 3: Verifying database setup...');
    
    // Check if we can connect and query
    const { data: organizations, error: orgError } = await DatabaseUtils.getOrganization('00000000-0000-0000-0000-000000000000');
    
    if (orgError) {
      console.error('❌ Database verification failed:', orgError);
      process.exit(1);
    }
    
    console.log('✅ Database verification completed successfully\n');

    // Step 4: Display setup summary
    console.log('📊 Setup Summary:');
    console.log('================');
    console.log('✅ Database schema created');
    console.log('✅ RLS policies configured');
    console.log('✅ Indexes created for performance');
    console.log('✅ Initial data seeded');
    console.log('✅ Super admin user created (admin@logoslms.com)');
    console.log('✅ Sample organization created (Acme Learning Corp)');
    console.log('✅ Sample courses and content created');
    console.log('✅ System badges created');
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Login with admin@logoslms.com / SuperAdmin123!');
    console.log('4. Create your first organization');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };
