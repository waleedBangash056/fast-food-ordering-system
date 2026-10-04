param(
  [ValidateSet('REQUIREMENTS','MODELS','ARCHITECTURE_TECHNOLOGY','UX_DESIGN','DELIVERY_PLAN')]
  [Parameter(Mandatory=$true)][string]$Phase,
  [string]$ProjectPath = (Get-Location).Path
)
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path $ProjectPath).Path
$statePath = Join-Path $project 'FACTORY_STATE.json'
if (-not (Test-Path $statePath)) { throw "FACTORY_STATE.json not found in $project" }
$state = Get-Content $statePath -Raw | ConvertFrom-Json
$expected = @{
  REQUIREMENTS='REQUIREMENTS_PENDING_APPROVAL'
  MODELS='MODELS_PENDING_APPROVAL'
  ARCHITECTURE_TECHNOLOGY='ARCHITECTURE_PENDING_APPROVAL'
  UX_DESIGN='UX_DESIGN_PENDING_APPROVAL'
  DELIVERY_PLAN='DELIVERY_PLAN_PENDING_APPROVAL'
}[$Phase]
if ($state.phase -ne $expected) { throw "Cannot approve $Phase. Current state is '$($state.phase)'; expected '$expected'." }
Write-Host 'HUMAN APPROVAL REQUIRED' -ForegroundColor Yellow
Write-Host "Project: $project"
Write-Host "Phase:   $Phase"
Write-Host 'This action must be performed by the human operator, not the Website Factory agent.'
$nonce = [guid]::NewGuid().ToString('N').Substring(0,12).ToUpperInvariant()
Write-Host "Approval code: $nonce" -ForegroundColor Cyan
$entry = Read-Host 'Re-enter the approval code to approve this phase'
if ($entry -ne $nonce) { throw 'Approval code mismatch. No approval recorded.' }
$controlRoot = Join-Path $HOME '.website-factory-control'
$approvalDir = Join-Path $controlRoot 'approvals'
New-Item -ItemType Directory -Force $approvalDir | Out-Null
$projectKey = ([System.Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($project)) | ForEach-Object ToString x2) -join ''
$ticketPath = Join-Path $approvalDir "$projectKey.json"
$existing = @()
if (Test-Path $ticketPath) {
  try { $existing = @((Get-Content $ticketPath -Raw | ConvertFrom-Json).approvals) } catch { $existing=@() }
}
$approvals = @($existing | Where-Object { $_ -ne $Phase }) + $Phase
$ticket = [ordered]@{
  factory_version='7.4.0'
  project=$project
  approvals=($approvals | Sort-Object -Unique)
  last_approved_phase=$Phase
  approved_at=(Get-Date).ToString('o')
  ticket_id=([guid]::NewGuid().ToString())
}
$ticket | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $ticketPath
Write-Host "APPROVAL RECORDED: $Phase" -ForegroundColor Green
Write-Host "Ticket: $($ticket.ticket_id)"
Write-Host 'Re-run the factory agent. It may now proceed only where the validated gate sequence permits.'
