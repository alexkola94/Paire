using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddItineraryEventAttachmentsColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Lightweight attachment metadata for itinerary events
            migrationBuilder.AddColumn<string>(
                name: "attachment_url",
                table: "itinerary_events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "attachment_name",
                table: "itinerary_events",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "attachment_type",
                table: "itinerary_events",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "attachment_size",
                table: "itinerary_events",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "attachment_url",
                table: "itinerary_events");

            migrationBuilder.DropColumn(
                name: "attachment_name",
                table: "itinerary_events");

            migrationBuilder.DropColumn(
                name: "attachment_type",
                table: "itinerary_events");

            migrationBuilder.DropColumn(
                name: "attachment_size",
                table: "itinerary_events");
        }
    }
}
