using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddSavedPlaces : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "saved_places",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: true),
                    poi_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "other"),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    website = table.Column<string>(type: "text", nullable: true),
                    opening_hours = table.Column<string>(type: "text", nullable: true),
                    rating = table.Column<double>(type: "double precision", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "overpass"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_saved_places", x => x.id);
                    table.ForeignKey(
                        name: "FK_saved_places_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_saved_places_trip_id",
                table: "saved_places",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_saved_places_trip_id_poi_id",
                table: "saved_places",
                columns: new[] { "trip_id", "poi_id" });

            migrationBuilder.CreateIndex(
                name: "IX_saved_places_trip_id_user_id",
                table: "saved_places",
                columns: new[] { "trip_id", "user_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "saved_places");
        }
    }
}
