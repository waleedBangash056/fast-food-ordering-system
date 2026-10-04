param([Parameter(Mandatory=$true)][string]$StatePath)
$ErrorActionPreference = 'Stop'
$state = Get-Content $StatePath -Raw | ConvertFrom-Json
$allowed = @(
  'INTAKE',
  'REQUIREMENTS_PENDING_APPROVAL',
  'MODELS_PENDING_APPROVAL',
  'ARCHITECTURE_PENDING_APPROVAL',
  'UX_DESIGN_PENDING_APPROVAL',
  'DELIVERY_PLAN_PENDING_APPROVAL',
  'IMPLEMENTATION_IN_PROGRESS',
  'SYSTEM_VERIFYING',
  'RELEASE_PENDING_APPROVAL',
  'READY_FOR_LOCAL_USER_ACCEPTANCE',
  'HANDOFF_COMPLETE'
)
if ($allowed -notcontains $state.phase) { throw "Invalid phase: $($state.phase)" }
if (-not $state.project) { throw 'Project is empty.' }
$project = (Resolve-Path (Split-Path -Parent $StatePath)).Path
if (Test-Path (Join-Path $project '.website-factory-package')) { throw "REFUSING FACTORY PACKAGE WORKSPACE: $project" }
if ($state.factory_version -ne '7.4.0') { throw "Unsupported factory version in state: $($state.factory_version)" }

$approvalDir = Join-Path (Join-Path $HOME '.website-factory-control') 'approvals'
$projectKey = ([System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($project)) | ForEach-Object ToString x2) -join ''
$ticketPath = Join-Path $approvalDir "$projectKey.json"
$required = switch ($state.phase) {
  'MODELS_PENDING_APPROVAL' { @('REQUIREMENTS') }
  'ARCHITECTURE_PENDING_APPROVAL' { @('REQUIREMENTS','MODELS') }
  'UX_DESIGN_PENDING_APPROVAL' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY') }
  'DELIVERY_PLAN_PENDING_APPROVAL' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN') }
  'IMPLEMENTATION_IN_PROGRESS' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN','DELIVERY_PLAN') }
  'SYSTEM_VERIFYING' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN','DELIVERY_PLAN') }
  'RELEASE_PENDING_APPROVAL' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN','DELIVERY_PLAN') }
  'READY_FOR_LOCAL_USER_ACCEPTANCE' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN','DELIVERY_PLAN') }
  'HANDOFF_COMPLETE' { @('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN','DELIVERY_PLAN') }
  default { @() }
}

if ($required.Count -gt 0) {
  if (-not (Test-Path $ticketPath)) { throw "HUMAN_APPROVAL_REQUIRED: no external approval ticket exists for project $project" }
  $ticket = Get-Content $ticketPath -Raw | ConvertFrom-Json
  if ($ticket.project -ne $project) { throw 'Approval ticket project mismatch.' }
  if ($ticket.factory_version -ne '7.4.0') { throw 'Approval ticket factory version mismatch.' }
  $actual = @($ticket.approvals)
  foreach ($r in $required) { if ($actual -notcontains $r) { throw "HUMAN_APPROVAL_REQUIRED: missing approval for $r" } }
  if ($state.approved_phases) {
    foreach ($p in @($state.approved_phases)) {
      if ($actual -notcontains $p) { throw "STATE_TAMPERING: state claims approval '$p' not present in external ticket" }
    }
  }
}

$pending = @('REQUIREMENTS_PENDING_APPROVAL','MODELS_PENDING_APPROVAL','ARCHITECTURE_PENDING_APPROVAL','UX_DESIGN_PENDING_APPROVAL','DELIVERY_PLAN_PENDING_APPROVAL')
if ($pending -contains $state.phase) {
  if ($state.awaiting_user_approval -ne $true) { throw "STATE_INVALID: pending approval phase must set awaiting_user_approval=true" }
  if ($state.approved_phases -and $required) {
    foreach ($p in @($state.approved_phases)) {
      if ($required -notcontains $p) { throw "STATE_TAMPERING: approval '$p' is ahead of current pending gate" }
    }
  }
}
if ($state.phase -eq 'INTAKE' -and @($state.approved_phases).Count -gt 0) { throw 'STATE_TAMPERING: no approvals are valid during intake.' }
if ($state.phase -eq 'IMPLEMENTATION_IN_PROGRESS' -and $state.awaiting_user_approval -eq $true) { throw 'STATE_INVALID: implementation cannot be awaiting user approval.' }
if ($state.phase -eq 'SYSTEM_VERIFYING' -and $state.implementation_complete -ne $true) { throw 'STATE_INVALID: system verification requires implementation_complete=true.' }
if ($state.phase -eq 'READY_FOR_LOCAL_USER_ACCEPTANCE' -and $state.system_verification_status -ne 'PASS') { throw 'STATE_INVALID: UAT cannot start before system verification PASS.' }
Write-Output ((@{decision='allow'; phase=$state.phase; project=$state.project; external_approval_ticket=$ticketPath}) | ConvertTo-Json -Compress)
