var builder = DistributedApplication.CreateBuilder(args);
var mongo = builder.AddMongoDB("mongo");
var mongoDb = mongo.AddDatabase("xframenosql");
var sqlServer = builder.AddSqlServer("sqlserver");
var sqlDb = sqlServer.AddDatabase("xframesql");
var cache = builder.AddRedis("cache");

var apiService = builder.AddProject<Projects.XFrame_ApiService>("apiservice")
    .WithReference(mongoDb)
    .WithReference(sqlDb)
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
