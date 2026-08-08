using System.Globalization;
using System.Numerics;
using XFrame.Web.Services.Abstract;

namespace XFrame.Web.Services.Concrete;

public sealed class ObjModelImporter : IModelImporter
{
    public string Format => "obj";

    public async Task<ImportedModel> ImportAsync(Stream source, CancellationToken cancellationToken = default)
    {
        var positions = new List<Vector3>();
        var texCoords = new List<Vector2>();
        var faces = new List<(int Position, int? Uv)>();
        var faceSizes = new List<int>();
        using var reader = new StreamReader(source, leaveOpen: true);
        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) is not null)
        {
            var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length < 2 || parts[0].StartsWith('#')) continue;
            if (parts[0] == "v" && parts.Length >= 4)
                positions.Add(new Vector3(Parse(parts[1]), Parse(parts[2]), Parse(parts[3])));
            else if (parts[0] == "vt" && parts.Length >= 3)
                texCoords.Add(new Vector2(Parse(parts[1]), 1f - Parse(parts[2])));
            else if (parts[0] == "f" && parts.Length >= 4)
            {
                var count = parts.Length - 1;
                faceSizes.Add(count);
                foreach (var token in parts.Skip(1))
                {
                    var values = token.Split('/');
                    var position = ResolveIndex(values[0], positions.Count);
                    int? uv = values.Length > 1 && !string.IsNullOrWhiteSpace(values[1]) ? ResolveIndex(values[1], texCoords.Count) : null;
                    faces.Add((position, uv));
                }
            }
        }
        if (positions.Count == 0 || faces.Count == 0) throw new InvalidDataException("O OBJ não contém geometria utilizável.");

        var hasUv = texCoords.Count > 0 && faces.Any(face => face.Uv.HasValue);
        var finalPositions = new List<Vector3>();
        var finalUvs = hasUv ? new List<Vector2>() : null;
        var indices = new List<uint>();
        var cursor = 0;
        var map = new Dictionary<(int Position, int? Uv), uint>();
        foreach (var size in faceSizes)
        {
            var faceIndices = new List<uint>(size);
            for (var i = 0; i < size; i++)
            {
                var key = faces[cursor++];
                if (!map.TryGetValue(key, out var index))
                {
                    index = (uint)finalPositions.Count;
                    map[key] = index;
                    finalPositions.Add(positions[key.Position]);
                    if (finalUvs is not null) finalUvs.Add(key.Uv.HasValue ? texCoords[key.Uv.Value] : Vector2.Zero);
                }
                faceIndices.Add(index);
            }
            for (var i = 1; i < faceIndices.Count - 1; i++) { indices.Add(faceIndices[0]); indices.Add(faceIndices[i]); indices.Add(faceIndices[i + 1]); }
        }

        var min = new Vector3(finalPositions.Min(value => value.X), finalPositions.Min(value => value.Y), finalPositions.Min(value => value.Z));
        var max = new Vector3(finalPositions.Max(value => value.X), finalPositions.Max(value => value.Y), finalPositions.Max(value => value.Z));
        var vertexData = finalPositions.SelectMany(value => new[] { value.X, value.Y, value.Z }).ToArray();
        var uvData = finalUvs?.SelectMany(value => new[] { value.X, value.Y }).ToArray();
        return new ImportedModel(Format, new RuntimeMesh(vertexData, [.. indices], uvData), max - min);
    }

    private static int ResolveIndex(string value, int count)
    {
        var index = int.Parse(value, CultureInfo.InvariantCulture);
        return index < 0 ? count + index : index - 1;
    }

    private static float Parse(string value) => float.Parse(value, CultureInfo.InvariantCulture);
}
