using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddBankTransactionSyncFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bank_account_id",
                table: "transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_transaction_id",
                table: "transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_bank_synced",
                table: "transactions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_transactions_bank_transaction_id",
                table: "transactions",
                column: "bank_transaction_id");

            migrationBuilder.CreateIndex(
                name: "IX_transactions_is_bank_synced",
                table: "transactions",
                column: "is_bank_synced");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_transactions_bank_transaction_id",
                table: "transactions");

            migrationBuilder.DropIndex(
                name: "IX_transactions_is_bank_synced",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "bank_account_id",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "bank_transaction_id",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "is_bank_synced",
                table: "transactions");
        }
    }
}
