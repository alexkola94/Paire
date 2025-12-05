using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSavingsGoalsIconColumnIfMissing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add icon column to savings_goals if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'savings_goals' 
                        AND column_name = 'icon'
                    ) THEN
                        ALTER TABLE savings_goals ADD COLUMN icon text;
                    END IF;
                END $$;
            ");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Note: We don't explicitly drop the column in Down migration
            // as it was added conditionally. If needed, you can add:
            // ALTER TABLE savings_goals DROP COLUMN IF EXISTS icon;

        }
    }
}
