$ErrorActionPreference = 'Stop'

function Find-VivaldiRoot {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Vivaldi\Application'),
        (Join-Path $env:ProgramFiles 'Vivaldi\Application'),
        (Join-Path ${env:ProgramFiles(x86)} 'Vivaldi\Application')
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($root in $candidates) {
        $versions = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^\d+\.\d+' } |
            Sort-Object { try { [version]$_.Name } catch { [version]'0.0' } } -Descending

        foreach ($v in $versions) {
            $res = Join-Path $v.FullName 'resources\vivaldi'
            if (Test-Path $res) {
                return @{ Root=$root; Version=$v.Name; Resources=$res }
            }
        }
    }

    throw 'Vivaldi installation was not found.'
}

$found = Find-VivaldiRoot
$resDir = $found.Resources
$htmlPath = $null

foreach ($name in @('window.html','browser.html')) {
    $p = Join-Path $resDir $name
    if (Test-Path $p) {
        $htmlPath = $p
        break
    }
}

if (-not $htmlPath) {
    throw "Neither window.html nor browser.html was found in $resDir"
}

$srcJs = Join-Path $PSScriptRoot 'tab-marker-vivaldi.js'
if (-not (Test-Path $srcJs)) {
    throw "Missing $srcJs"
}

$modsDir = Join-Path $resDir 'custom-js'
New-Item -ItemType Directory -Force -Path $modsDir | Out-Null
$dstJs = Join-Path $modsDir 'tab-marker-vivaldi.js'
Copy-Item $srcJs $dstJs -Force

$backup = "$htmlPath.tabmarker-backup"
if (-not (Test-Path $backup)) {
    Copy-Item $htmlPath $backup
}

$tag = '<script src="custom-js/tab-marker-vivaldi.js"></script>'
$text = [IO.File]::ReadAllText($htmlPath)

if ($text -notmatch [regex]::Escape($tag)) {
    if ($text -notmatch '</body>') {
        throw "Could not find </body> in $htmlPath"
    }

    $text = $text -replace '</body>', "  $tag`r`n</body>"
    [IO.File]::WriteAllText($htmlPath, $text, (New-Object Text.UTF8Encoding($false)))
}

Write-Host ''
Write-Host 'Vivaldi Tab Marker v1.0 installed.' -ForegroundColor Green
Write-Host "Vivaldi version: $($found.Version)"
Write-Host "Modified: $htmlPath"
Write-Host ''
Write-Host 'Start Vivaldi again.' -ForegroundColor Yellow
Write-Host 'After every Vivaldi update, run install.cmd again.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Press Enter to close'
