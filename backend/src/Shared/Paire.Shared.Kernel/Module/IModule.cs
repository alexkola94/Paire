using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Paire.Shared.Kernel.Module;

/// <summary>
/// Each domain module implements this to register its services and map its endpoints.
/// </summary>
public interface IModule
{
    static abstract IServiceCollection AddModule(IServiceCollection services, IConfiguration configuration);
    static abstract IEndpointRouteBuilder MapEndpoints(IEndpointRouteBuilder endpoints);
}
