import type { Database } from "@db/sqlite";

interface MigrationFile {
  version: string;
  name: string;
  direction: "up" | "down";
}

export class MigrationRunner {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  private async getMigrationFiles(): Promise<MigrationFile[]> {
    const migrationsDir = import.meta.dirname + "/../migrations";
    const migrationFiles: MigrationFile[] = [];

    for await (const file of Deno.readDir(migrationsDir)) {
      if (file.isFile) {
        // Parse filename format: {version}_{name}.{direction}.sql
        const match = file.name.match(/^(\d+)_(.+)\.(up|down)\.sql$/);
        if (match) {
          const [, version, name, direction] = match;
          migrationFiles.push({
            version,
            name,
            direction: direction as "up" | "down",
          });
        }
      }
    }

    // Sort by version number
    return migrationFiles.sort((a, b) =>
      Number.parseInt(a.version) - Number.parseInt(b.version)
    );
  }

  /**
   * Gets all migrations that have been applied to the database
   */
  private getAppliedMigrations(): string[] {
    try {
      const result = this.db
        .sql`SELECT migration_name FROM schema_migrations ORDER BY migration_name`;
      return Array.from(result as Array<{ migration_name: string }>).map(
        (row) => row.migration_name,
      );
    } catch (_) {
      // If the schema_migrations table doesn't exist yet, return empty array
      return [];
    }
  }

  /**
   * Runs all pending up migrations
   */
  public async runMigrations(): Promise<void> {
    const allMigrationFiles = await this.getMigrationFiles();
    const appliedMigrations = this.getAppliedMigrations();

    // Separate up and down migrations
    const upMigrations = allMigrationFiles.filter((m) => m.direction === "up");
    const _ = allMigrationFiles.filter((m) => m.direction === "down");

    // Find all up migrations that haven't been applied yet
    const pendingMigrations = upMigrations.filter(
      (migration) =>
        !appliedMigrations.includes(`${migration.version}_${migration.name}`),
    );

    for (const migration of pendingMigrations) {
      const migrationContent = await Deno.readTextFile(
        `${import.meta.dirname}/../migrations/${migration.version}_${migration.name}.up.sql`,
      );

      // Execute the migration in a transaction
      try {
        this.db.transaction(() => {
          this.db.exec(migrationContent);
          this.db
            .sql`INSERT INTO schema_migrations (migration_name) VALUES (${`${migration.version}_${migration.name}`})`;
        })();
      } catch (error) {
        console.error(
          `Failed to apply migration ${migration.version}_${migration.name}:`,
          error,
        );
        throw error;
      }
    }
  }

  /**
   * Rolls back the last migration (or a specific one)
   */
  public async rollbackMigration(migrationName?: string): Promise<void> {
    let migrationToRollback: string | undefined = migrationName;

    if (!migrationToRollback) {
      // Get the most recently applied migration
      const appliedMigrations = this.getAppliedMigrations();
      if (appliedMigrations.length === 0) {
        console.warn("No migrations to rollback");
        return;
      }
      migrationToRollback = appliedMigrations[appliedMigrations.length - 1];
    }

    if (!migrationToRollback) {
      console.warn("No migrations to rollback");
      return;
    }

    // Parse the migration name to get version and name
    const match = migrationToRollback.match(/^(\d+)_(.+)$/);
    if (!match) {
      throw new Error(`Invalid migration name format: ${migrationToRollback}`);
    }
    const [, version, name] = match;

    console.info(`Rolling back migration: ${migrationToRollback}`);

    // Check if the down migration file exists
    try {
      await Deno.stat(`./src/migrations/${version}_${name}.down.sql`);
    } catch {
      throw new Error(
        `Down migration file does not exist for: ${migrationToRollback}`,
      );
    }

    // Read and execute the down migration
    const migrationContent = await Deno.readTextFile(
      `./src/migrations/${version}_${name}.down.sql`,
    );

    // Execute the rollback in a transaction
    try {
      this.db.transaction(() => {
        this.db.exec(migrationContent);
        this.db
          .sql`DELETE FROM schema_migrations WHERE migration_name = ${migrationToRollback}`;
      })();
    } catch (error) {
      console.error(
        `Failed to rollback migration ${migrationToRollback}:`,
        error,
      );
      throw error;
    }
  }
}
