using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringBillsNotesColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add notes column to recurring_bills if it doesn't exist
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'recurring_bills' 
                        AND column_name = 'notes'
                    ) THEN
                        ALTER TABLE recurring_bills ADD COLUMN notes text;
                    END IF;
                END $$;
            ");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove notes column from recurring_bills if it exists
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN 
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'recurring_bills' 
                        AND column_name = 'notes'
                    ) THEN
                        ALTER TABLE recurring_bills DROP COLUMN notes;
                    END IF;
                END $$;
            ");

        }
    }
}
