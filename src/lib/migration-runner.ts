import { readFileSync } from "fs";
import { join } from "path";

import { supabaseAdmin } from "./supabase";

export interface Migration {
  version: string;
  name: string;
  filename: string;
  executed_at?: Date;
}

export class MigrationRunner {
  private migrationsDir: string;

  constructor(migrationsDir: string = join(process.cwd(), "migrations")) {
    this.migrationsDir = migrationsDir;
  }

  /**
   * Get all available migration files
   */
  private async getAvailableMigrations(): Promise<Migration[]> {
    const fs = await import("fs");
    
    try {
      const files = fs.readdirSync(this.migrationsDir)
        .filter((file) => file.endsWith(".sql"))
        .sort();

      return files.map((file) => {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        if (!match) {
          throw new Error(`Invalid migration filename: ${file}`);
        }
        
        return {
          version: match[1]!,
          name: match[2]!.replace(/_/g, " "),
          filename: file,
        };
      });
    } catch (error) {
      console.error("Error reading migrations directory:", error);
      return [];
    }
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<Migration[]> {
    try {
      // Create migrations table if it doesn't exist
      await supabaseAdmin.rpc("exec_sql", {
        sql: `
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      });

      const { data, error } = await supabaseAdmin
        .from("schema_migrations")
        .select("*")
        .order("version");

      if (error) {
        console.error("Error fetching executed migrations:", error);
        return [];
      }

      return data ?? [];
    } catch (error) {
      console.error("Error getting executed migrations:", error);
      return [];
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(migration: Migration): Promise<boolean> {
    try {
      console.log(`Executing migration: ${migration.filename}`);
      
      const migrationPath = join(this.migrationsDir, migration.filename);
      const sql = readFileSync(migrationPath, "utf8");

      // Execute the migration SQL
      const { error: execError } = await supabaseAdmin.rpc("exec_sql", {
        sql,
      });

      if (execError) {
        console.error(
          `Error executing migration ${migration.filename}:`,
          execError,
        );
        return false;
      }

      // Record the migration as executed
      const { error: recordError } = await supabaseAdmin
        .from("schema_migrations")
        .insert({
          version: migration.version,
          name: migration.name,
          executed_at: new Date().toISOString(),
        });

      if (recordError) {
        console.error(
          `Error recording migration ${migration.filename}:`,
          recordError,
        );
        return false;
      }

      console.log(`✓ Migration ${migration.filename} executed successfully`);
      return true;
    } catch (error) {
      console.error(`Error executing migration ${migration.filename}:`, error);
      return false;
    }
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<boolean> {
    try {
      console.log("Starting database migrations...");
      
      const availableMigrations = await this.getAvailableMigrations();
      const executedMigrations = await this.getExecutedMigrations();
      
      const executedVersions = new Set(
        executedMigrations.map((m) => m.version),
      );
      const pendingMigrations = availableMigrations.filter(
        (m) => !executedVersions.has(m.version),
      );

      if (pendingMigrations.length === 0) {
        console.log("No pending migrations found.");
        return true;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations:`);
      pendingMigrations.forEach((m) => console.log(`  - ${m.filename}`));

      // Execute migrations in order
      for (const migration of pendingMigrations) {
        const success = await this.executeMigration(migration);
        if (!success) {
          console.error(
            `Migration ${migration.filename} failed. Stopping execution.`,
          );
          return false;
        }
      }

      console.log("All migrations completed successfully!");
      return true;
    } catch (error) {
      console.error("Error running migrations:", error);
      return false;
    }
  }

  /**
   * Check migration status
   */
  async getStatus(): Promise<{
    available: Migration[];
    executed: Migration[];
    pending: Migration[];
  }> {
    const availableMigrations = await this.getAvailableMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    const executedVersions = new Set(
      executedMigrations.map((m) => m.version),
    );
    const pendingMigrations = availableMigrations.filter(
      (m) => !executedVersions.has(m.version),
    );

    return {
      available: availableMigrations,
      executed: executedMigrations,
      pending: pendingMigrations,
    };
  }

  /**
   * Rollback the last migration (if supported)
   */
  async rollbackLast(): Promise<boolean> {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      
      if (executedMigrations.length === 0) {
        console.log("No migrations to rollback.");
        return true;
      }

      const lastMigration = executedMigrations[executedMigrations.length - 1];
      if (!lastMigration) {
        console.log("No migrations to rollback.");
        return true;
      }
      
      console.log(
        `Rolling back migration: ${lastMigration.version}_${lastMigration.name}`,
      );
      
      // Note: This is a simplified rollback. In production, you'd want
      // to implement proper rollback scripts for each migration.
      const { error } = await supabaseAdmin
        .from("schema_migrations")
        .delete()
        .eq("version", lastMigration.version);

      if (error) {
        console.error("Error rolling back migration:", error);
        return false;
      }

      console.log(
        `✓ Migration ${lastMigration.version} rolled back successfully`,
      );
      return true;
    } catch (error) {
      console.error("Error rolling back migration:", error);
      return false;
    }
  }
}

// CLI interface for running migrations
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2];

  switch (command) {
    case "migrate":
      runner.runMigrations().then((success) => {
        process.exit(success ? 0 : 1);
      });
      break;
    case "status":
      runner.getStatus().then((status) => {
        console.log("\nMigration Status:");
        console.log(`Available: ${status.available.length}`);
        console.log(`Executed: ${status.executed.length}`);
        console.log(`Pending: ${status.pending.length}`);
        
        if (status.pending.length > 0) {
          console.log("\nPending migrations:");
          status.pending.forEach((m) => console.log(`  - ${m.filename}`));
        }
      });
      break;
    case "rollback":
      runner.rollbackLast().then((success) => {
        process.exit(success ? 0 : 1);
      });
      break;
    default:
      console.log("Usage: node migration-runner.js [migrate|status|rollback]");
      process.exit(1);
  }
}
