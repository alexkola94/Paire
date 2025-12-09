using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class RemoveReminderPreferencesForeignKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the foreign key constraint that references auth.users(id)
            // This is necessary because we use ASP.NET Identity (AspNetUsers table) instead of Supabase Auth (auth.users)
            migrationBuilder.Sql(@"
                DO $$ 
                BEGIN
                    IF EXISTS (
                        SELECT 1 
                        FROM information_schema.table_constraints 
                        WHERE constraint_name = 'reminder_preferences_user_id_fkey' 
                        AND table_name = 'reminder_preferences'
                    ) THEN
                        ALTER TABLE reminder_preferences 
                        DROP CONSTRAINT reminder_preferences_user_id_fkey;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Note: We don't recreate the foreign key constraint in Down() because
            // it would fail for users that don't exist in auth.users table
            // If you need to restore it, you'll need to ensure all users exist in auth.users first
        }
    }
}
