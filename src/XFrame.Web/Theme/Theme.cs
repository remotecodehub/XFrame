using MudBlazor;

namespace XFrame.Web.Theme;
public class Theme
{
    public static MudTheme CurrentTheme = RoyalBlueTheme;

    // ==========================================
    // TEMA 1: ROYAL BLUE THEME
    // ==========================================
    public static MudTheme RoyalBlueTheme => new()
    {
        PaletteLight = new PaletteLight()
        { 
            Primary = "#0284C7",          
            PrimaryLighten = "#38BDF8",
            PrimaryDarken = "#0369A1",
            PrimaryContrastText = "#FFFFFF",
 
            Secondary = "#0284C7",        
            SecondaryLighten = "#E0F2FE",
            SecondaryDarken = "#075985",
            SecondaryContrastText = "#FFFFFF",
 
            Tertiary = "#0C4A6E",
            TertiaryLighten = "#0369A1",
            TertiaryDarken = "#082F49",
            TertiaryContrastText = "#FFFFFF",
 
            Background = "#F8FAFC",        
            BackgroundGray = "#F1F5F9",    
            Surface = "#FFFFFF",          

            AppbarBackground = "#0284C7",
            AppbarText = "#FFFFFF",

            DrawerBackground = "#FFFFFF",  
            DrawerText = "#0F172A",
            DrawerIcon = "#0284C7",

            TextPrimary = "#0F172A",       
            TextSecondary = "#475569",
            TextDisabled = "#94A3B8",
 
            Success = "#16A34A",
            SuccessLighten = "#DCFCE7",
            SuccessDarken = "#15803D",
            SuccessContrastText = "#FFFFFF",

            Warning = "#D97706",
            WarningLighten = "#FEF3C7",
            WarningDarken = "#B45309",
            WarningContrastText = "#FFFFFF",

            Error = "#DC2626",
            ErrorLighten = "#FEE2E2",
            ErrorDarken = "#B91C1C",
            ErrorContrastText = "#FFFFFF",

            Info = "#0891B2",
            InfoLighten = "#CFFAFE",
            InfoDarken = "#155E75",
            InfoContrastText = "#FFFFFF",
 
            Divider = "#E2E8F0",
            DividerLight = "#F1F5F9",
            TableStriped = "rgba(2, 132, 199, 0.03)",
            TableHover = "rgba(2, 132, 199, 0.08)",
            TableLines = "#E2E8F0",

            ActionDefault = "#475569",
            ActionDisabled = "#CBD5E1",
            ActionDisabledBackground = "#F1F5F9",
            
            HoverOpacity = 0.06,
            RippleOpacity = 0.1,
            RippleOpacitySecondary = 0.08,
            BorderOpacity = 0.12,

            Black = "#000000",
            White = "#FFFFFF",
            Dark = "#0F172A",
            DarkLighten = "#1E293B",
            DarkDarken = "#020617",
            DarkContrastText = "#FFFFFF"
        },
        PaletteDark = new PaletteDark()
        { 
            Primary = "#38BDF8",
            PrimaryLighten = "#7DD3FC",
            PrimaryDarken = "#0284C7",
            PrimaryContrastText = "#0F172A",
 
            Secondary = "#818CF8",
            SecondaryLighten = "#A5B4FC",
            SecondaryDarken = "#6366F1",
            SecondaryContrastText = "#0F172A",
 
            Tertiary = "#BAE6FD",
            TertiaryLighten = "#E0F2FE",
            TertiaryDarken = "#7DD3FC",
            TertiaryContrastText = "#0F172A",
 
            Background = "#0B0F19",         
            BackgroundGray = "#111827",     
            Surface = "#1E293B",            

            AppbarBackground = "#0F172A",
            AppbarText = "#F8FAFC",

            DrawerBackground = "#0F172A",   
            DrawerText = "#F8FAFC",
            DrawerIcon = "#38BDF8",

            TextPrimary = "#F8FAFC",
            TextSecondary = "#94A3B8",
            TextDisabled = "#64748B",

            // Status
            Success = "#4ADE80",
            SuccessLighten = "#86EFAC",
            SuccessDarken = "#22C55E",
            SuccessContrastText = "#022C22",

            Warning = "#FACC15",
            WarningLighten = "#FDE68A",
            WarningDarken = "#EAB308",
            WarningContrastText = "#422006",

            Error = "#F87171",
            ErrorLighten = "#FCA5A5",
            ErrorDarken = "#EF4444",
            ErrorContrastText = "#450A0A",

            Info = "#22D3EE",
            InfoLighten = "#67E8F9",
            InfoDarken = "#06B6D4",
            InfoContrastText = "#083344",

            // Divisores e Tabelas
            Divider = "rgba(148, 163, 184, 0.15)",
            DividerLight = "rgba(148, 163, 184, 0.08)",
            TableStriped = "rgba(255, 255, 255, 0.02)",
            TableHover = "rgba(56, 189, 248, 0.08)",
            TableLines = "rgba(148, 163, 184, 0.15)",

            ActionDefault = "#94A3B8",
            ActionDisabled = "#475569",
            ActionDisabledBackground = "rgba(255, 255, 255, 0.05)",

            HoverOpacity = 0.08,
            RippleOpacity = 0.1,
            RippleOpacitySecondary = 0.08,
            BorderOpacity = 0.12,

            Black = "#000000",
            White = "#FFFFFF",
            Dark = "#020617",
            DarkLighten = "#0F172A",
            DarkDarken = "#0B0F19",
            DarkContrastText = "#F8FAFC"
        },
        LayoutProperties = new LayoutProperties() 
        { 
            DefaultBorderRadius = "12px",  
            AppbarHeight = "56px"          
        },
    };
}