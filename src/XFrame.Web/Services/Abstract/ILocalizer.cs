namespace XFrame.Web.Services.Abstract;

public interface ILocalizer
{
    string this[string key] { get; }
}
