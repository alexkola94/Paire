using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddItineraryEventAttachmentsFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use raw SQL with IF NOT EXISTS to be resilient if columns already exist
            migrationBuilder.Sql(@"
                ALTER TABLE itinerary_events
                ADD COLUMN IF NOT EXISTS attachment_url text;

                ALTER TABLE itinerary_events
                ADD COLUMN IF NOT EXISTS attachment_name varchar(255);

                ALTER TABLE itinerary_events
                ADD COLUMN IF NOT EXISTS attachment_type varchar(100);

                ALTER TABLE itinerary_events
                ADD COLUMN IF NOT EXISTS attachment_size bigint;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                ALTER TABLE itinerary_events
                DROP COLUMN IF EXISTS attachment_url;

                ALTER TABLE itinerary_events
                DROP COLUMN IF EXISTS attachment_name;

                ALTER TABLE itinerary_events
                DROP COLUMN IF EXISTS attachment_type;

                ALTER TABLE itinerary_events
                DROP COLUMN IF EXISTS attachment_size;
            ");
        }
    }
}
