using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddReminderPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "user_profiles");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "savings_goals");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "recurring_bills");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "partnerships");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "loans");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "loan_payments");

            migrationBuilder.DropColumn(
                name: "AlertThreshold",
                table: "budgets");

            migrationBuilder.DropColumn(
                name: "BaseUrl",
                table: "budgets");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "budgets");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "savings_goals",
                newName: "notes");

            migrationBuilder.RenameColumn(
                name: "Icon",
                table: "savings_goals",
                newName: "icon");

            migrationBuilder.RenameColumn(
                name: "Color",
                table: "savings_goals",
                newName: "color");

            migrationBuilder.RenameColumn(
                name: "Notes",
                table: "recurring_bills",
                newName: "notes");

            migrationBuilder.CreateTable(
                name: "reminder_preferences",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    email_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    bill_reminders_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    bill_reminder_days = table.Column<int>(type: "integer", nullable: false),
                    loan_reminders_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    loan_reminder_days = table.Column<int>(type: "integer", nullable: false),
                    budget_alerts_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    budget_alert_threshold = table.Column<decimal>(type: "numeric(5,2)", nullable: false),
                    savings_milestones_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reminder_preferences", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reminder_preferences_user_id",
                table: "reminder_preferences",
                column: "user_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reminder_preferences");

            migrationBuilder.RenameColumn(
                name: "notes",
                table: "savings_goals",
                newName: "Notes");

            migrationBuilder.RenameColumn(
                name: "icon",
                table: "savings_goals",
                newName: "Icon");

            migrationBuilder.RenameColumn(
                name: "color",
                table: "savings_goals",
                newName: "Color");

            migrationBuilder.RenameColumn(
                name: "notes",
                table: "recurring_bills",
                newName: "Notes");

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "user_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "savings_goals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "recurring_bills",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "partnerships",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "loans",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "loan_payments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AlertThreshold",
                table: "budgets",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaseUrl",
                table: "budgets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "budgets",
                type: "text",
                nullable: true);
        }
    }
}
