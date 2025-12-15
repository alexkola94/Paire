using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddImportHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "import_history_id",
                table: "transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "import_history",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    import_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    transaction_count = table.Column<int>(type: "integer", nullable: false),
                    total_amount = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_history", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_transactions_import_history_id",
                table: "transactions",
                column: "import_history_id");

            migrationBuilder.CreateIndex(
                name: "IX_import_history_import_date",
                table: "import_history",
                column: "import_date");

            migrationBuilder.CreateIndex(
                name: "IX_import_history_user_id",
                table: "import_history",
                column: "user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_transactions_import_history_import_history_id",
                table: "transactions",
                column: "import_history_id",
                principalTable: "import_history",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_transactions_import_history_import_history_id",
                table: "transactions");

            migrationBuilder.DropTable(
                name: "import_history");

            migrationBuilder.DropIndex(
                name: "IX_transactions_import_history_id",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "import_history_id",
                table: "transactions");
        }
    }
}
