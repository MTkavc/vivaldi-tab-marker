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
                return @{ Version=$v.Name; Resources=$res }
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
    throw 'Vivaldi UI html file was not found.'
}

$tag = '<script src="custom-js/tab-marker-vivaldi.js"></script>'
$text = [IO.File]::ReadAllText($htmlPath)
$text = $text.Replace("  $tag`r`n", '').Replace("  $tag`n", '').Replace($tag, '')
[IO.File]::WriteAllText($htmlPath, $text, (New-Object Text.UTF8Encoding($false)))

$dstJs = Join-Path $resDir 'custom-js\tab-marker-vivaldi.js'
if (Test-Path $dstJs) {
    Remove-Item $dstJs -Force
}

Write-Host ''
Write-Host 'Vivaldi Tab Marker v1.0 removed from the current Vivaldi version.' -ForegroundColor Green
Write-Host 'Start Vivaldi again.' -ForegroundColor Yellow
Write-Host ''
Read-Host 'Press Enter to close'
