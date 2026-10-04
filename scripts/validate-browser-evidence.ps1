[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$EvidenceRoot = "qa\evidence\browser",
    [Parameter(Mandatory = $false)]
    [string]$ManifestPath = "qa\evidence\browser\browser-evidence-manifest.json"
)

$ErrorActionPreference = 'Stop'

function Get-SafeEvidenceFile {
    param(
        [string]$RelativePath,
        [string]$Root,
        [string]$Label
    )

    if ([string]::IsNullOrWhiteSpace($RelativePath)) {
        throw "$Label is empty."
    }

    $candidate = Join-Path $Root $RelativePath
    $rootFull = [IO.Path]::GetFullPath((Resolve-Path $Root).Path) + [IO.Path]::DirectorySeparatorChar
    $candidateFull = [IO.Path]::GetFullPath($candidate)

    if (-not $candidateFull.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
        throw "$Label escapes evidence root: $RelativePath"
    }

    if (-not (Test-Path $candidateFull -PathType Leaf)) {
        throw "Missing $Label artifact: $candidateFull"
    }

    return $candidateFull
}

if (-not (Test-Path $EvidenceRoot -PathType Container)) {
    throw "Browser evidence directory does not exist: $EvidenceRoot"
}

foreach ($name in @('desktop', 'mobile', 'results', 'console', 'network')) {
    $dir = Join-Path $EvidenceRoot $name
    if (-not (Test-Path $dir -PathType Container)) {
        throw "Missing required browser evidence directory: $dir"
    }
}

if (-not (Test-Path $ManifestPath -PathType Leaf)) {
    throw "Missing route-level browser evidence manifest: $ManifestPath"
}

try {
    $manifest = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
} catch {
    throw "Could not parse browser evidence manifest: $($_.Exception.Message)"
}

if ($null -eq $manifest.routes -or @($manifest.routes).Count -eq 0) {
    throw "Browser evidence manifest must contain at least one route."
}

$rootResolved = (Resolve-Path $EvidenceRoot).Path
$routeIds = New-Object 'System.Collections.Generic.HashSet[string]'

foreach ($route in @($manifest.routes)) {
    foreach ($field in @('id', 'path', 'desktopScreenshot', 'mobileScreenshot', 'resultFile', 'consoleLog', 'networkLog')) {
        if (-not $route.PSObject.Properties.Name.Contains($field)) {
            throw "Route '$($route.id)' is missing required field '$field'."
        }
    }

    if (-not $routeIds.Add([string]$route.id)) {
        throw "Duplicate route id in browser evidence manifest: $($route.id)"
    }

    Get-SafeEvidenceFile -RelativePath $route.desktopScreenshot -Root $rootResolved -Label "desktop screenshot for $($route.path)" | Out-Null
    Get-SafeEvidenceFile -RelativePath $route.mobileScreenshot -Root $rootResolved -Label "mobile screenshot for $($route.path)" | Out-Null
    Get-SafeEvidenceFile -RelativePath $route.resultFile -Root $rootResolved -Label "browser result for $($route.path)" | Out-Null
    Get-SafeEvidenceFile -RelativePath $route.consoleLog -Root $rootResolved -Label "console log for $($route.path)" | Out-Null
    Get-SafeEvidenceFile -RelativePath $route.networkLog -Root $rootResolved -Label "network log for $($route.path)" | Out-Null
}

$images = Get-ChildItem -Path $EvidenceRoot -Recurse -File |
    Where-Object { $_.Extension -in '.png', '.jpg', '.jpeg', '.webp' }

Write-Host "Browser evidence validation PASS"
Write-Host "Routes covered: $(@($manifest.routes).Count)"
Write-Host "Screenshots: $($images.Count)"
