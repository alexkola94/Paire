namespace Paire.Modules.AI.Core.Exceptions;

/// <summary>
/// Thrown when the AI Gateway or RAG service returns a non-success status (e.g. 500).
/// The response body from the remote service is preserved for debugging and client display.
/// </summary>
public class RemoteServiceException : HttpRequestException
{
    public new int StatusCode { get; }
    public string? ResponseBody { get; }

    public RemoteServiceException(string message, int statusCode, string? responseBody = null)
        : base(message)
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }
}
