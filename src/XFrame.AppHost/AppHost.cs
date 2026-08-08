var builder = DistributedApplication.CreateBuilder(args);

var cache = builder.AddRedis("cache");

var apiService = builder.AddProject<Projects.XFrame_ApiService>("apiservice")
    .WithHttpHealthCheck("/health");

builder.AddProject<Projects.XFrame_Web>("webfrontend")
    .WithEnvironment("ForceAnonymousAuth", "true")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithReference(cache)
    .WaitFor(cache)
    .WithReference(apiService)
    .WaitFor(apiService);

builder.Build().Run();
