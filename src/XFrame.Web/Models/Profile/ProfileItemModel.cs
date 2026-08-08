namespace XFrame.Web.Models.Profile;

public class ProfileItemModel
{
    public string Name { get; set; } = string.Empty;
    public float Length { get; set; }
    public float PosX { get; set; }
    public float PosY { get; set; }
    public float PosZ { get; set; }
    public float CutAngleStart { get; set; }
    public float CutAngleEnd { get; set; }
    public string Material { get; set; } = string.Empty;
}