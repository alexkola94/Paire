using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Paire.Modules.AI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS conversations (
                    id uuid NOT NULL,
                    user_id text NOT NULL,
                    title text NULL,
                    last_message_at timestamp with time zone NULL,
                    message_count integer NOT NULL DEFAULT 0,
                    summary text NULL,
                    is_archived boolean NOT NULL DEFAULT FALSE,
                    created_at timestamp with time zone NOT NULL,
                    updated_at timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_conversations"" PRIMARY KEY (id)
                );
                CREATE INDEX IF NOT EXISTS IX_conversations_user_id ON conversations (user_id);

                CREATE TABLE IF NOT EXISTS conversation_messages (
                    id uuid NOT NULL,
                    conversation_id uuid NOT NULL,
                    role character varying(50) NOT NULL DEFAULT 'user',
                    content text NOT NULL,
                    message_type character varying(50) NOT NULL DEFAULT 'text',
                    created_at timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_conversation_messages"" PRIMARY KEY (id),
                    CONSTRAINT ""FK_conversation_messages_conversations_conversation_id"" 
                        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS IX_conversation_messages_conversation_id ON conversation_messages (conversation_id);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "conversation_messages");

            migrationBuilder.DropTable(
                name: "conversations");
        }
    }
}
