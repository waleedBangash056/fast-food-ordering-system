$ErrorActionPreference = 'Continue'
$checks = [ordered]@{}
$commands = @('git','node','npm','python','agy','docker','codeql','semgrep','zap.sh','k6','jscpd','gitleaks','npx')
foreach ($c in $commands) {
  try {
    $cmd = Get-Command $c -ErrorAction Stop
    $checks[$c] = @{installed=$true; path=$cmd.Source}
  } catch { $checks[$c] = @{installed=$false} }
}
$checks['playwright_cli'] = @{installed=(Test-Path (Join-Path (Get-Location) 'node_modules\.bin\playwright.cmd'))}
$checks['axe_playwright_dependency'] = @{installed=(Test-Path (Join-Path (Get-Location) 'node_modules\@axe-core\playwright'))}
$checks['ui_ux_pro_max_global'] = @{installed=(Test-Path (Join-Path $HOME '.agents\skills\ui-ux-pro-max\SKILL.md'))}
$checks['ponytail_rule'] = @{installed=(Test-Path (Join-Path (Get-Location) '.agents\rules\ponytail.md'))}
$checks | ConvertTo-Json -Depth 5
