using Microsoft.Extensions.Localization;

namespace XFrame.Web.Services.Concrete;

public class Localizer(IStringLocalizerFactory factory) : Abstract.ILocalizer
{
    private readonly IStringLocalizer _localizer = factory.Create(
            "Localization",
            typeof(Localizer).Assembly.FullName!
        );

    public string this[string key] => _localizer[key];

}
