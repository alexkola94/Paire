using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingColumnsFixed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Priority",
                table: "savings_goals",
                newName: "priority");

            migrationBuilder.RenameColumn(
                name: "Category",
                table: "savings_goals",
                newName: "category");

            migrationBuilder.RenameColumn(
                name: "ReminderDays",
                table: "recurring_bills",
                newName: "reminder_days");

            migrationBuilder.RenameColumn(
                name: "DueDay",
                table: "recurring_bills",
                newName: "due_day");

            migrationBuilder.RenameColumn(
                name: "AutoPay",
                table: "recurring_bills",
                newName: "auto_pay");

            migrationBuilder.AlterColumn<bool>(
                name: "is_achieved",
                table: "savings_goals",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "priority",
                table: "savings_goals",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "medium",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "category",
                table: "savings_goals",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "recurring_bills",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean");

            migrationBuilder.AlterColumn<string>(
                name: "frequency",
                table: "recurring_bills",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "monthly",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<int>(
                name: "reminder_days",
                table: "recurring_bills",
                type: "integer",
                nullable: false,
                defaultValue: 3,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<bool>(
                name: "auto_pay",
                table: "recurring_bills",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "priority",
                table: "savings_goals",
                newName: "Priority");

            migrationBuilder.RenameColumn(
                name: "category",
                table: "savings_goals",
                newName: "Category");

            migrationBuilder.RenameColumn(
                name: "reminder_days",
                table: "recurring_bills",
                newName: "ReminderDays");

            migrationBuilder.RenameColumn(
                name: "due_day",
                table: "recurring_bills",
                newName: "DueDay");

            migrationBuilder.RenameColumn(
                name: "auto_pay",
                table: "recurring_bills",
                newName: "AutoPay");

            migrationBuilder.AlterColumn<string>(
                name: "Priority",
                table: "savings_goals",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "medium");

            migrationBuilder.AlterColumn<bool>(
                name: "is_achieved",
                table: "savings_goals",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Category",
                table: "savings_goals",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<bool>(
                name: "is_active",
                table: "recurring_bills",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<string>(
                name: "frequency",
                table: "recurring_bills",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldDefaultValue: "monthly");

            migrationBuilder.AlterColumn<int>(
                name: "ReminderDays",
                table: "recurring_bills",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 3);

            migrationBuilder.AlterColumn<bool>(
                name: "AutoPay",
                table: "recurring_bills",
                type: "boolean",
                nullable: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);
        }
    }
}
