using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddPaireFeaturesTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "chatbot_personality",
                table: "reminder_preferences",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "supportive");

            migrationBuilder.AddColumn<bool>(
                name: "weekly_recap_enabled",
                table: "reminder_preferences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "financial_health_scores",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    overall_score = table.Column<int>(type: "integer", nullable: false),
                    budget_adherence_score = table.Column<int>(type: "integer", nullable: false),
                    savings_rate_score = table.Column<int>(type: "integer", nullable: false),
                    debt_health_score = table.Column<int>(type: "integer", nullable: false),
                    expense_consistency_score = table.Column<int>(type: "integer", nullable: false),
                    goal_progress_score = table.Column<int>(type: "integer", nullable: false),
                    tips = table.Column<string>(type: "text", nullable: true),
                    calculated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    period = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_health_scores", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "paire_homes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    home_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false, defaultValue: "Love Nest"),
                    level = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    total_points = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    unlocked_rooms = table.Column<string>(type: "text", nullable: false, defaultValue: "[]"),
                    room_levels = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    room_points = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    decorations = table.Column<string>(type: "text", nullable: false, defaultValue: "{}"),
                    seasonal_theme = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "default"),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_paire_homes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_streaks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    streak_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    current_streak = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    longest_streak = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    last_activity_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    total_points = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_streaks", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "weekly_recaps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    week_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    week_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    total_spent = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    total_income = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    top_categories = table.Column<string>(type: "text", nullable: true),
                    insights = table.Column<string>(type: "text", nullable: true),
                    personality_mode = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "supportive"),
                    formatted_content = table.Column<string>(type: "text", nullable: true),
                    email_sent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    notification_sent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_weekly_recaps", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_financial_health_scores_period",
                table: "financial_health_scores",
                column: "period");

            migrationBuilder.CreateIndex(
                name: "IX_financial_health_scores_user_id",
                table: "financial_health_scores",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_financial_health_scores_user_id_period",
                table: "financial_health_scores",
                columns: new[] { "user_id", "period" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_paire_homes_user_id",
                table: "paire_homes",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_streaks_user_id",
                table: "user_streaks",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_streaks_user_id_streak_type",
                table: "user_streaks",
                columns: new[] { "user_id", "streak_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_weekly_recaps_user_id",
                table: "weekly_recaps",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_weekly_recaps_user_id_week_start",
                table: "weekly_recaps",
                columns: new[] { "user_id", "week_start" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "financial_health_scores");

            migrationBuilder.DropTable(
                name: "paire_homes");

            migrationBuilder.DropTable(
                name: "user_streaks");

            migrationBuilder.DropTable(
                name: "weekly_recaps");

            migrationBuilder.DropColumn(
                name: "chatbot_personality",
                table: "reminder_preferences");

            migrationBuilder.DropColumn(
                name: "weekly_recap_enabled",
                table: "reminder_preferences");
        }
    }
}
