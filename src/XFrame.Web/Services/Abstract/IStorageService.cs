namespace XFrame.Web.Services.Abstract;

public interface IStorageService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T data);
}
