using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddTravelNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "push_subscriptions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    endpoint = table.Column<string>(type: "text", nullable: false),
                    p256dh_key = table.Column<string>(type: "text", nullable: false),
                    auth_key = table.Column<string>(type: "text", nullable: false),
                    user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    last_used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_push_subscriptions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "travel_notification_preferences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: true),
                    document_expiry_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    document_expiry_days = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "30,14,7,1"),
                    budget_alerts_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    budget_threshold_75_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    budget_threshold_90_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    budget_exceeded_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    itinerary_reminders_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    itinerary_reminder_hours = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "24,6,1"),
                    packing_progress_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    trip_approaching_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    trip_approaching_days = table.Column<int>(type: "integer", nullable: false, defaultValue: 7),
                    email_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    push_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    in_app_enabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travel_notification_preferences", x => x.id);
                    table.ForeignKey(
                        name: "FK_travel_notification_preferences_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "travel_notifications",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: true),
                    type = table.Column<string>(type: "text", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    priority = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "medium"),
                    data_json = table.Column<string>(type: "text", nullable: true),
                    reference_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reference_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    email_sent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    email_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    push_sent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    push_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    read_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_travel_notifications", x => x.id);
                    table.ForeignKey(
                        name: "FK_travel_notifications_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_push_subscriptions_user_id",
                table: "push_subscriptions",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_push_subscriptions_user_id_is_active",
                table: "push_subscriptions",
                columns: new[] { "user_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_travel_notification_preferences_trip_id",
                table: "travel_notification_preferences",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_notification_preferences_user_id",
                table: "travel_notification_preferences",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_notification_preferences_user_id_trip_id",
                table: "travel_notification_preferences",
                columns: new[] { "user_id", "trip_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_travel_notifications_trip_id",
                table: "travel_notifications",
                column: "trip_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_notifications_user_id",
                table: "travel_notifications",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_travel_notifications_user_id_read_at",
                table: "travel_notifications",
                columns: new[] { "user_id", "read_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "push_subscriptions");

            migrationBuilder.DropTable(
                name: "travel_notification_preferences");

            migrationBuilder.DropTable(
                name: "travel_notifications");
        }
    }
}
