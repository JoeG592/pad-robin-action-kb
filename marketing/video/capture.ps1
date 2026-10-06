# capture.ps1 - paste each flow into the open PAD Designer, require the expected result, and capture:
#   <flow>-empty.png  window with an empty canvas (before paste)
#   <flow>-full.png   window after paste, scrolled to top, nothing selected
#   <flow>-strip.png  every canvas row stacked top to bottom (canvas width), from paged captures
#   <flow>.json       status, errors, action count, window/canvas rects, rows {i,name,y,h} in strip coords, badge rect
# Run ONLY in a visible terminal with PAD Designer open on PAD_Robin_test. Hands off mouse/keyboard.
# Flows whose name starts with 00-hook-memory are expected to FAIL (errors on the canvas); all others must
# paste with 0 errors and at least one action (0 actions = the Designer silently rejected the paste).
param(
    [string]$Flow = "",   # comma-separated flow names without .robin; empty = all flows in -FlowDir
    [string]$FlowDir = (Join-Path $PSScriptRoot "flows"),
    [string]$OutDir = (Join-Path $PSScriptRoot "captures"),
    [string]$Validator = "C:\Claude Code Projects\singularity-dashboard\Scripts\Library\PAD-Robin-Validator-v3.ps1"
)
$ErrorActionPreference = "Stop"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class W {
    [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr v);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, IntPtr e);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
[W]::SetProcessDpiAwarenessContext([IntPtr](-4)) | Out-Null
Add-Type -AssemblyName System.Drawing
$env:PAD_IMPORT_ONLY = "1"; . $Validator; $env:PAD_IMPORT_ONLY = ""
$UIA = [System.Windows.Automation.AutomationElement]

$d = Find-Designer
if (-not $d) { throw "PAD Designer not found" }
if ($d.Title -notmatch '\| PAD_Robin_test$') { throw "Refusing: Designer title is '$($d.Title)', expected PAD_Robin_test" }
$h = $d.Process.MainWindowHandle
New-Item -ItemType Directory -Force $OutDir | Out-Null

function Get-WinRect { $r = New-Object W+RECT; [W]::GetWindowRect($h, [ref]$r) | Out-Null; $r }
function Grab {
    $wr = Get-WinRect
    $bmp = New-Object System.Drawing.Bitmap ($wr.Right - $wr.Left), ($wr.Bottom - $wr.Top)
    $g = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $g.GetHdc()
    [W]::PrintWindow($h, $hdc, 2) | Out-Null
    $g.ReleaseHdc($hdc); $g.Dispose()
    return $bmp
}
function Get-Rows {
    $icp = $d.Canvas.GetCurrentPattern([System.Windows.Automation.ItemContainerPattern]::Pattern)
    $out = @(); $prev = $null; $i = 0
    while ($true) {
        $it = $icp.FindItemByProperty($prev, $null, $null); if (-not $it) { break }
        $b = $it.Current.BoundingRectangle
        $out += [pscustomobject]@{ i = $i; name = $it.Current.Name; x = $b.X; y = $b.Y; w = $b.Width; h = $b.Height; off = ($it.Current.IsOffscreen -or $b.IsEmpty) }
        $prev = $it; $i++
    }
    return $out
}
function Get-StatusTexts {
    $d.Root.FindAll([System.Windows.Automation.TreeScope]::Descendants,
        (New-Object System.Windows.Automation.PropertyCondition($UIA::ControlTypeProperty, [System.Windows.Automation.ControlType]::Text))) |
        ForEach-Object { $_.Current.Name }
}
function Clear-Canvas {
    $d.Canvas.SetFocus(); Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("^a"); Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("{DELETE}"); Start-Sleep -Milliseconds 900
}
function Get-Scroll {
    # null when the canvas has no vertical scroll (the flow fits on one screen)
    try {
        $p = $d.Canvas.GetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern)
        if ($p.Current.VerticallyScrollable) { return $p } else { return $null }
    } catch { return $null }
}
function Deselect {
    [W]::SetForegroundWindow($h) | Out-Null
    $d.Canvas.SetFocus(); [System.Windows.Forms.SendKeys]::SendWait("{ESC}"); Start-Sleep -Milliseconds 400
    if ((Get-StatusTexts) -contains "0 Selected actions") { [W]::SetCursorPos(5, 5) | Out-Null; return }
    $cv = $d.Canvas.Current.BoundingRectangle
    $vis = Get-Rows | Where-Object { -not $_.off } | Select-Object -Last 1
    $y = [int]($vis.y + $vis.h + 25)
    if ($y -lt $cv.Bottom - 5) {
        [W]::SetCursorPos([int]($cv.X + $cv.Width * 0.6), $y) | Out-Null; Start-Sleep -Milliseconds 150
        [W]::mouse_event(2, 0, 0, 0, [IntPtr]::Zero); [W]::mouse_event(4, 0, 0, 0, [IntPtr]::Zero); Start-Sleep -Milliseconds 500
    }
    [W]::SetCursorPos(5, 5) | Out-Null
    if (-not ((Get-StatusTexts) -contains "0 Selected actions")) { throw "Could not deselect actions" }
}

$names = @($Flow -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$files = if ($names.Count) { $names | ForEach-Object { Join-Path $FlowDir "$_.robin" } } else { Get-ChildItem $FlowDir -Filter *.robin | Sort-Object Name | ForEach-Object FullName }
foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file)) { throw "Missing flow file: $file" }
    $name = [IO.Path]::GetFileNameWithoutExtension($file)
    $expectFail = $name -like "00-hook-memory*"
    Write-Host "== $name" -ForegroundColor Cyan

    Clear-Canvas; [W]::SetCursorPos(5, 5) | Out-Null; Start-Sleep -Milliseconds 300
    $e = Grab; $e.Save((Join-Path $OutDir "$name-empty.png"), [System.Drawing.Imaging.ImageFormat]::Png); $e.Dispose()

    $r = Invoke-PasteValidate -RobinScript (Get-Content -LiteralPath $file -Raw) -Label $name -Designer $d
    Write-Host ("   paste: {0} actions={1} errors={2}" -f $r.Status, $r.ActionCount, $r.ErrorCount)
    if ($r.ActionCount -eq 0) { throw "${name}: 0 actions on the canvas - the Designer silently rejected the paste" }
    if ($expectFail -and $r.Status -ne "FAIL") { throw "$name was expected to FAIL but got $($r.Status)" }
    if (-not $expectFail -and ($r.Status -ne "PASS" -or $r.ErrorCount -ne 0)) { throw "$name did not paste clean: $($r.Errors)" }

    Deselect
    $sp = Get-Scroll
    if ($sp) { $sp.SetScrollPercent(-1, 0); Start-Sleep -Milliseconds 500 }
    $wr = Get-WinRect
    $full = Grab; $full.Save((Join-Path $OutDir "$name-full.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $cvb = $d.Canvas.Current.BoundingRectangle
    $canvas = @{ x = [int]$cvb.X - $wr.Left; y = [int]$cvb.Y - $wr.Top; w = [int]$cvb.Width; h = [int]$cvb.Height }

    # Collect one exact slice per row, paging down until every row has one.
    $slices = @{}; $meta = @{}; $total = @(Get-Rows).Count; $bmp = $full; $guard = 0
    while ($true) {
        foreach ($row in (Get-Rows)) {
            if ($row.off -or $slices.ContainsKey($row.i)) { continue }
            $top = [int]$row.y - $wr.Top; $hgt = [int]$row.h
            if ($top -lt $canvas.y -or ($top + $hgt) -gt ($canvas.y + $canvas.h)) { continue }   # only fully visible rows
            $slices[$row.i] = $bmp.Clone((New-Object System.Drawing.Rectangle $canvas.x, $top, $canvas.w, $hgt), $bmp.PixelFormat)
            $meta[$row.i] = $row.name
        }
        if ($slices.Count -ge $total) { break }
        if (-not $sp -or ++$guard -gt 40) { throw "${name}: captured $($slices.Count) of $total rows" }
        $sp.Scroll([System.Windows.Automation.ScrollAmount]::NoAmount, [System.Windows.Automation.ScrollAmount]::LargeIncrement)
        Start-Sleep -Milliseconds 600
        if (-not [object]::ReferenceEquals($bmp, $full)) { $bmp.Dispose() }
        $bmp = Grab
    }
    if (-not [object]::ReferenceEquals($bmp, $full)) { $bmp.Dispose() }
    if ($sp) { $sp.SetScrollPercent(-1, 0) }

    $height = 0; foreach ($i in 0..($total - 1)) { $height += $slices[$i].Height }
    $strip = New-Object System.Drawing.Bitmap $canvas.w, $height
    $g = [System.Drawing.Graphics]::FromImage($strip); $y = 0; $rows = @()
    foreach ($i in 0..($total - 1)) {
        $g.DrawImage($slices[$i], 0, $y, $canvas.w, $slices[$i].Height)
        $rows += [pscustomobject]@{ i = $i; name = $meta[$i]; y = $y; h = $slices[$i].Height }
        $y += $slices[$i].Height; $slices[$i].Dispose()
    }
    $g.Dispose(); $strip.Save((Join-Path $OutDir "$name-strip.png"), [System.Drawing.Imaging.ImageFormat]::Png); $strip.Dispose()

    $W = $wr.Right - $wr.Left; $H = $wr.Bottom - $wr.Top
    $patch = $full.GetPixel($W - 14, 100)   # right-rail background, used to cover the flow-checker icon + badge
    $full.Dispose()
    [pscustomobject]@{
        flow = $name; status = $r.Status; errors = @($r.Errors -split '; ' | Where-Object { $_ }); actions = $r.ActionCount
        window = @{ w = $W; h = $H }; canvas = $canvas; stripHeight = $height; rows = $rows
        badge = @{ x = $W - 58; y = 104; w = 44; h = 44; color = ('#{0:X2}{1:X2}{2:X2}' -f $patch.R, $patch.G, $patch.B) }
    } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutDir "$name.json") -Encoding UTF8
    Write-Host "   captured $W x $H, strip $($canvas.w) x $height, $total rows" -ForegroundColor Green
}
Clear-Canvas
Write-Host "done"
