using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class addDashboardOverviewModeToReminderPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "dashboard_overview_mode",
                table: "reminder_preferences",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "dashboard_overview_mode",
                table: "reminder_preferences");
        }
    }
}
