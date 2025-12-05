using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddDataClearingRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "data_clearing_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    requester_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    partner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    requester_confirmed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    partner_confirmed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    confirmation_token = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "pending"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_data_clearing_requests", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_data_clearing_requests_confirmation_token",
                table: "data_clearing_requests",
                column: "confirmation_token");

            migrationBuilder.CreateIndex(
                name: "IX_data_clearing_requests_requester_user_id",
                table: "data_clearing_requests",
                column: "requester_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_data_clearing_requests_status",
                table: "data_clearing_requests",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "data_clearing_requests");
        }
    }
}
