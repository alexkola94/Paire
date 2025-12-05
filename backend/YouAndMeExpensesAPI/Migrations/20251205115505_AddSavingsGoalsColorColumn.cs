using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSavingsGoalsColorColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add color column to savings_goals if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'savings_goals' 
                        AND column_name = 'color'
                    ) THEN
                        ALTER TABLE savings_goals ADD COLUMN color text;
                    END IF;
                END $$;
            ");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove color column from savings_goals if it exists
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'savings_goals' 
                        AND column_name = 'color'
                    ) THEN
                        ALTER TABLE savings_goals DROP COLUMN color;
                    END IF;
                END $$;
            ");
        }
    }
}
