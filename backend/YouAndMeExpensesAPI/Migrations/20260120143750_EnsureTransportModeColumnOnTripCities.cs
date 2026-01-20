using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class EnsureTransportModeColumnOnTripCities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use raw SQL so we can safely add the column even if the model snapshot
            // already thinks it exists (e.g. database created before the travel migrations).
            migrationBuilder.Sql(@"
                ALTER TABLE trip_cities
                ADD COLUMN IF NOT EXISTS transport_mode text NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Rollback helper: drop the column if it exists.
            migrationBuilder.Sql(@"
                ALTER TABLE trip_cities
                DROP COLUMN IF EXISTS transport_mode;
            ");
        }
    }
}
