using Microsoft.AspNetCore.Components.Authorization;
using System.Security.Claims;

namespace XFrame.Web.Providers;
public class FakeAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly bool _isAuthenticated;

    public FakeAuthenticationStateProvider(bool isAuthenticated)
    {
        _isAuthenticated = isAuthenticated;
    }

    public override Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        ClaimsPrincipal user;
        if (_isAuthenticated)
        {
            var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "Test User") }, "TestAuthType");
            user = new ClaimsPrincipal(identity);
        }
        else
        {
            user = new ClaimsPrincipal(new ClaimsIdentity()); // Anonymous
        }

        return Task.FromResult(new AuthenticationState(user));
    }
}