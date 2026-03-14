using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YouAndMeExpensesAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddHomeFurnitureTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "home_furniture",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<string>(type: "text", nullable: false),
                    room_name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    furniture_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    unlocked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_home_furniture", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_home_furniture_user_id_room_name_furniture_code",
                table: "home_furniture",
                columns: new[] { "user_id", "room_name", "furniture_code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "home_furniture");
        }
    }
}
