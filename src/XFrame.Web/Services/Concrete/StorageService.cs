using Blazored.LocalStorage;
using XFrame.Web.Services.Abstract;

namespace XFrame.Web.Services.Concrete;

public class StorageService(ILocalStorageService localStorage) : IStorageService
{
    private readonly ILocalStorageService _localStorage = localStorage;

    public async Task<T?> GetAsync<T>(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentNullException(nameof(key), "The setting key cannot be null.");

        return await _localStorage.GetItemAsync<T>(key);
    }

    public async Task SetAsync<T>(string key, T data)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentNullException(nameof(key), "The setting key cannot be null.");

        await _localStorage.SetItemAsync(key, data);
    }
}
