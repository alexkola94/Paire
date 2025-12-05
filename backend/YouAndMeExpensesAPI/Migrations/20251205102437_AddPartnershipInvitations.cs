using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPartnershipInvitations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "partnership_invitations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    inviter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    invitee_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    token = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    accepted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_partnership_invitations", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_partnership_invitations_invitee_email",
                table: "partnership_invitations",
                column: "invitee_email");

            migrationBuilder.CreateIndex(
                name: "IX_partnership_invitations_inviter_id",
                table: "partnership_invitations",
                column: "inviter_id");

            migrationBuilder.CreateIndex(
                name: "IX_partnership_invitations_status",
                table: "partnership_invitations",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_partnership_invitations_token",
                table: "partnership_invitations",
                column: "token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "partnership_invitations");
        }
    }
}
