using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddTravelTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trips",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    destination = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    budget = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    budget_currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "EUR"),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "planning"),
                    cover_image = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trips", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "itinerary_events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "activity"),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    start_time = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    end_time = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    location = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    address = table.Column<string>(type: "text", nullable: true),
                    latitude = table.Column<double>(type: "double precision", nullable: true),
                    longitude = table.Column<double>(type: "double precision", nullable: true),
                    confirmation_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    flight_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    airline = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    departure_airport = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    arrival_airport = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    check_in_time = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    check_out_time = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    room_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "confirmed"),
                    reminder_minutes = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_itinerary_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_itinerary_events_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "packing_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "other"),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    is_checked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_essential = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_packing_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_packing_items_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "travel_documents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "other"),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    document_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    expiry_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    issue_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    issuing_country = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    file_url = table.Column<string>(type: "text", nullable: true),
                    file_thumbnail = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travel_documents", x => x.id);
                    table.ForeignKey(
                        name: "FK_travel_documents_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "travel_expenses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "other"),
                    amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "EUR"),
                    amount_in_base_currency = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    exchange_rate = table.Column<decimal>(type: "numeric(18,6)", nullable: false, defaultValue: 1m),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    payment_method = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    receipt_url = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travel_expenses", x => x.id);
                    table.ForeignKey(
                        name: "FK_travel_expenses_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_itinerary_events_date",
                table: "itinerary_events",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_itinerary_events_trip_id",
                table: "itinerary_events",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_itinerary_events_trip_id_date",
                table: "itinerary_events",
                columns: new[] { "trip_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_packing_items_trip_id",
                table: "packing_items",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_packing_items_trip_id_category",
                table: "packing_items",
                columns: new[] { "trip_id", "category" });

            migrationBuilder.CreateIndex(
                name: "IX_travel_documents_trip_id",
                table: "travel_documents",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_documents_trip_id_type",
                table: "travel_documents",
                columns: new[] { "trip_id", "type" });

            migrationBuilder.CreateIndex(
                name: "IX_travel_expenses_date",
                table: "travel_expenses",
                column: "date");

            migrationBuilder.CreateIndex(
                name: "IX_travel_expenses_trip_id",
                table: "travel_expenses",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_expenses_trip_id_category",
                table: "travel_expenses",
                columns: new[] { "trip_id", "category" });

            migrationBuilder.CreateIndex(
                name: "IX_travel_expenses_trip_id_date",
                table: "travel_expenses",
                columns: new[] { "trip_id", "date" });

            migrationBuilder.CreateIndex(
                name: "IX_trips_start_date",
                table: "trips",
                column: "start_date");

            migrationBuilder.CreateIndex(
                name: "IX_trips_status",
                table: "trips",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_trips_user_id",
                table: "trips",
                column: "user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "itinerary_events");

            migrationBuilder.DropTable(
                name: "packing_items");

            migrationBuilder.DropTable(
                name: "travel_documents");

            migrationBuilder.DropTable(
                name: "travel_expenses");

            migrationBuilder.DropTable(
                name: "trips");
        }
    }
}
