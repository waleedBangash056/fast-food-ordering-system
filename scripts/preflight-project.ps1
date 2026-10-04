param([string]$ProjectPath = (Get-Location).Path)
$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path $ProjectPath).Path
if (Test-Path (Join-Path $resolved '.website-factory-package')) {
  throw "REFUSING TO RUN IN FACTORY PACKAGE DIRECTORY: $resolved`nCreate/open a separate customer project workspace outside the Website Factory distribution."
}
$statePath = Join-Path $resolved 'FACTORY_STATE.json'
if (Test-Path $statePath) {
  $state = Get-Content $statePath -Raw | ConvertFrom-Json
  if ($state.factory_version -and $state.factory_version -ne '7.4.0') {
    throw "Unsupported factory state version: $($state.factory_version). Use a v7 project or perform a documented migration."
  }
}
Write-Output ((@{decision='allow'; project=$resolved; factory_version='7.4.0'}) | ConvertTo-Json -Compress)
