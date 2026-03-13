using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddChallengesTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "challenges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    challenge_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "weekly"),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "spending"),
                    icon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    criteria_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "amount"),
                    criteria_value = table.Column<string>(type: "text", nullable: true),
                    reward_points = table.Column<int>(type: "integer", nullable: false, defaultValue: 50),
                    difficulty = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "medium"),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    is_recurring = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_challenges", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_challenges",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    challenge_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "active"),
                    progress = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0m),
                    target_value = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0m),
                    current_value = table.Column<decimal>(type: "numeric", nullable: false, defaultValue: 0m),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reward_claimed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_challenges", x => x.id);
                    table.ForeignKey(
                        name: "FK_user_challenges_challenges_challenge_id",
                        column: x => x.challenge_id,
                        principalTable: "challenges",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_challenges_code",
                table: "challenges",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_challenges_challenge_id",
                table: "user_challenges",
                column: "challenge_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_challenges_user_id_challenge_id_status",
                table: "user_challenges",
                columns: new[] { "user_id", "challenge_id", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_challenges");

            migrationBuilder.DropTable(
                name: "challenges");
        }
    }
}
