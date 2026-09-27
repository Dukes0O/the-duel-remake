$ErrorActionPreference = 'Stop'

$launcher = Join-Path $PSScriptRoot 'start-preview.bat'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
    throw "Preview launcher not found: $launcher"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'The Duel Preview.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'The Duel development preview with temporary saves'
$icon = Join-Path $PSScriptRoot 'game-icon.ico'
if (Test-Path -LiteralPath $icon -PathType Leaf) {
    $shortcut.IconLocation = "$icon,0"
}
$shortcut.Save()

Write-Host "Installed The Duel Preview on this player's Desktop."
Write-Host 'The shortcut follows this integration checkout and does not need administrator access.'
