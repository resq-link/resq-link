param(
    [string]$SourcePath = (Join-Path $PSScriptRoot '..\PROJECT_BRIEF.md'),
    [string]$OutputPath = (Join-Path $PSScriptRoot '..\RESQ-Link_Project_Brief.docx')
)

$ErrorActionPreference = 'Stop'

function To-Rgb([string]$Hex) {
    $hexValue = $Hex.TrimStart('#')
    $r = [Convert]::ToInt32($hexValue.Substring(0, 2), 16)
    $g = [Convert]::ToInt32($hexValue.Substring(2, 2), 16)
    $b = [Convert]::ToInt32($hexValue.Substring(4, 2), 16)
    return $r + (256 * $g) + (65536 * $b)
}

function Clean-Markdown([string]$Text) {
    return $Text.Replace('**', '').Replace('`', '')
}

function Add-PageBreak($Selection) {
    $Selection.InsertBreak(7)
}

function Add-Paragraph($Selection, [string]$Text, [string]$Style = 'Normal') {
    $Selection.Style = $Style
    $Selection.TypeText((Clean-Markdown $Text))
    $Selection.TypeParagraph()
}

function Add-Table($Document, $Selection, [object[]]$Rows, [bool]$HeaderRow = $true) {
    if ($Rows.Count -eq 0) { return }
    $columnCount = $Rows[0].Count
    $range = $Selection.Range
    $table = $Document.Tables.Add($range, $Rows.Count, $columnCount)
    $table.AllowAutoFit = $true
    $table.AutoFitBehavior(2)
    $table.Borders.Enable = 1
    $table.Range.Font.Name = 'Aptos'
    $table.Range.Font.Size = 9
    $table.Range.ParagraphFormat.SpaceAfter = 2
    $table.Range.ParagraphFormat.SpaceBefore = 2
    $table.Rows.AllowBreakAcrossPages = 0

    for ($rowIndex = 1; $rowIndex -le $Rows.Count; $rowIndex++) {
        for ($columnIndex = 1; $columnIndex -le $columnCount; $columnIndex++) {
            $cell = $table.Cell($rowIndex, $columnIndex)
            $cell.Range.Text = Clean-Markdown ([string]$Rows[$rowIndex - 1][$columnIndex - 1])
            $cell.VerticalAlignment = 1
            $cell.Range.ParagraphFormat.LeftIndent = 0
            $cell.Range.ParagraphFormat.RightIndent = 0
            $cell.TopPadding = 5
            $cell.BottomPadding = 5
            $cell.LeftPadding = 7
            $cell.RightPadding = 7
        }
    }

    if ($HeaderRow) {
        $table.Rows.Item(1).HeadingFormat = -1
        $table.Rows.Item(1).Range.Font.Bold = -1
        $table.Rows.Item(1).Range.Font.Color = To-Rgb '#FFFFFF'
        $table.Rows.Item(1).Shading.BackgroundPatternColor = To-Rgb '#0B6B61'
    }

    for ($rowIndex = $(if ($HeaderRow) { 2 } else { 1 }); $rowIndex -le $Rows.Count; $rowIndex++) {
        if ($rowIndex % 2 -eq 0) {
            $table.Rows.Item($rowIndex).Shading.BackgroundPatternColor = To-Rgb '#EAF4F2'
        }
    }

    $Selection.SetRange($table.Range.End, $table.Range.End)
    $Selection.TypeParagraph()
}

function Parse-TableRow([string]$Line) {
    $trimmed = $Line.Trim().Trim('|')
    return @($trimmed.Split('|') | ForEach-Object { $_.Trim() })
}

function Is-TableSeparator([string]$Line) {
    return $Line -match '^\s*\|(?:\s*:?-+:?\s*\|)+\s*$'
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
    throw "Source file not found: $SourcePath"
}

$source = Get-Content -LiteralPath $SourcePath -Encoding UTF8
$logoPath = Join-Path $PSScriptRoot '..\apps\dispatcher-web-app\public\branding\resq-link-logo.png'
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutput
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Add()
    $selection = $word.Selection

    $section = $document.Sections.Item(1)
    $section.PageSetup.PaperSize = 7
    $section.PageSetup.TopMargin = $word.CentimetersToPoints(2.2)
    $section.PageSetup.BottomMargin = $word.CentimetersToPoints(2.0)
    $section.PageSetup.LeftMargin = $word.CentimetersToPoints(2.25)
    $section.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)
    $section.PageSetup.DifferentFirstPageHeaderFooter = -1

    $normal = $document.Styles.Item('Normal')
    $normal.Font.Name = 'Aptos'
    $normal.Font.Size = 10.5
    $normal.Font.Color = To-Rgb '#243936'
    $normal.ParagraphFormat.SpaceAfter = 7
    $normal.ParagraphFormat.LineSpacingRule = 1
    $normal.ParagraphFormat.LineSpacing = 15

    foreach ($styleName in @('Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3')) {
        $style = $document.Styles.Item($styleName)
        $style.Font.Name = 'Aptos Display'
        $style.Font.Color = To-Rgb '#0B6B61'
    }
    $document.Styles.Item('Heading 1').Font.Size = 18
    $document.Styles.Item('Heading 1').Font.Bold = -1
    $document.Styles.Item('Heading 1').ParagraphFormat.SpaceBefore = 15
    $document.Styles.Item('Heading 1').ParagraphFormat.SpaceAfter = 7
    $document.Styles.Item('Heading 1').ParagraphFormat.KeepWithNext = -1
    $document.Styles.Item('Heading 2').Font.Size = 13
    $document.Styles.Item('Heading 2').Font.Bold = -1
    $document.Styles.Item('Heading 2').ParagraphFormat.SpaceBefore = 10
    $document.Styles.Item('Heading 2').ParagraphFormat.SpaceAfter = 5
    $document.Styles.Item('Heading 2').ParagraphFormat.KeepWithNext = -1
    $document.Styles.Item('Heading 3').Font.Size = 11
    $document.Styles.Item('Heading 3').Font.Bold = -1

    # Cover page
    $selection.ParagraphFormat.Alignment = 1
    $selection.ParagraphFormat.SpaceAfter = 0
    $selection.TypeParagraph()
    $selection.TypeParagraph()
    if (Test-Path -LiteralPath $logoPath) {
        $shape = $selection.InlineShapes.AddPicture([System.IO.Path]::GetFullPath($logoPath))
        if ($shape.Width -gt $word.CentimetersToPoints(7.2)) {
            $shape.LockAspectRatio = -1
            $shape.Width = $word.CentimetersToPoints(7.2)
        }
    }
    $selection.TypeParagraph()
    $selection.TypeParagraph()
    $selection.Style = 'Title'
    $selection.Font.Name = 'Aptos Display'
    $selection.Font.Size = 30
    $selection.Font.Bold = -1
    $selection.Font.Color = To-Rgb '#103D3A'
    $selection.TypeText('PROJECT BRIEF')
    $selection.TypeParagraph()
    $selection.Style = 'Subtitle'
    $selection.Font.Name = 'Aptos'
    $selection.Font.Size = 16
    $selection.Font.Bold = 0
    $selection.Font.Color = To-Rgb '#0B6B61'
    $selection.TypeText('Emergency Response and Dispatch System')
    $selection.TypeParagraph()
    $selection.TypeParagraph()

    $coverRows = @(
        @('PRIMARY SERVICE AREA', 'Tuguegarao City'),
        @('DOCUMENT VERSION', '1.0'),
        @('PREPARED', '21 August 2026'),
        @('REPOSITORY BASELINE', 'Commit 5ff8f17'),
        @('STATUS', 'Working implementation under active development and operational validation')
    )
    $coverRange = $selection.Range
    $coverTable = $document.Tables.Add($coverRange, $coverRows.Count, 2)
    $coverTable.Borders.Enable = 0
    $coverTable.AllowAutoFit = $false
    $coverTable.Columns.Item(1).Width = $word.CentimetersToPoints(4.5)
    $coverTable.Columns.Item(2).Width = $word.CentimetersToPoints(10.0)
    for ($r = 1; $r -le $coverRows.Count; $r++) {
        $coverTable.Cell($r, 1).Range.Text = $coverRows[$r - 1][0]
        $coverTable.Cell($r, 1).Range.Font.Name = 'Aptos'
        $coverTable.Cell($r, 1).Range.Font.Size = 8
        $coverTable.Cell($r, 1).Range.Font.Bold = -1
        $coverTable.Cell($r, 1).Range.Font.Color = To-Rgb '#0B6B61'
        $coverTable.Cell($r, 2).Range.Text = $coverRows[$r - 1][1]
        $coverTable.Cell($r, 2).Range.Font.Name = 'Aptos'
        $coverTable.Cell($r, 2).Range.Font.Size = 9.5
        $coverTable.Cell($r, 2).Range.Font.Color = To-Rgb '#243936'
        $coverTable.Rows.Item($r).Shading.BackgroundPatternColor = $(if ($r % 2 -eq 1) { To-Rgb '#EAF4F2' } else { To-Rgb '#FFFFFF' })
        foreach ($c in 1..2) {
            $coverTable.Cell($r, $c).TopPadding = 7
            $coverTable.Cell($r, $c).BottomPadding = 7
            $coverTable.Cell($r, $c).LeftPadding = 9
            $coverTable.Cell($r, $c).RightPadding = 9
        }
    }
    $selection.SetRange($coverTable.Range.End, $coverTable.Range.End)
    $selection.TypeParagraph()
    $selection.TypeParagraph()
    $selection.Font.Name = 'Aptos'
    $selection.Font.Size = 9
    $selection.Font.Color = To-Rgb '#5A706D'
    $selection.TypeText('Prepared from the current RESQ-Link system repository')

    # Header and footer for body pages
    $header = $section.Headers.Item(1).Range
    $header.Text = 'RESQ-LINK  |  PROJECT BRIEF'
    $header.Font.Name = 'Aptos'
    $header.Font.Size = 8
    $header.Font.Bold = -1
    $header.Font.Color = To-Rgb '#0B6B61'
    $header.ParagraphFormat.Alignment = 0
    $header.ParagraphFormat.Borders.Item(-3).LineStyle = 1
    $header.ParagraphFormat.Borders.Item(-3).Color = To-Rgb '#91C8BE'

    $footer = $section.Footers.Item(1).Range
    $footer.Text = 'Internal project reference  |  '
    $footer.Font.Name = 'Aptos'
    $footer.Font.Size = 8
    $footer.Font.Color = To-Rgb '#5A706D'
    $footer.ParagraphFormat.Alignment = 2
    $pageFieldRange = $footer.Duplicate
    $pageFieldRange.Collapse(0)
    $document.Fields.Add($pageFieldRange, 33) | Out-Null

    Add-PageBreak $selection

    # Table of contents
    Add-Paragraph $selection 'Contents' 'Title'
    $selection.Font.Reset()
    $tocRange = $selection.Range
    $toc = $document.TablesOfContents.Add($tocRange, $true, 1, 3)
    $selection.SetRange($toc.Range.End, $toc.Range.End)
    $selection.TypeParagraph()
    $selection.Font.Name = 'Aptos'
    $selection.Font.Size = 8.5
    $selection.Font.Italic = -1
    $selection.Font.Color = To-Rgb '#5A706D'
    $selection.TypeText('The contents list updates automatically when this document is opened in Microsoft Word.')
    $selection.TypeParagraph()
    Add-PageBreak $selection

    # Document control from the source's opening table.
    Add-Paragraph $selection 'Document Control' 'Heading 1'
    $metadata = @()
    $cursor = 1
    while ($cursor -lt $source.Count -and -not ($source[$cursor] -match '^## ')) {
        if ($source[$cursor] -match '^\s*\|' -and -not (Is-TableSeparator $source[$cursor])) {
            $metadata += ,(Parse-TableRow $source[$cursor])
        }
        $cursor++
    }
    Add-Table $document $selection $metadata $true

    # Main document parser.
    $paragraphBuffer = New-Object System.Collections.Generic.List[string]
    function Flush-ParagraphBuffer {
        if ($paragraphBuffer.Count -gt 0) {
            Add-Paragraph $selection (($paragraphBuffer -join ' ').Trim()) 'Normal'
            $paragraphBuffer.Clear()
        }
    }

    $index = $cursor
    while ($index -lt $source.Count) {
        $line = $source[$index]
        if ([string]::IsNullOrWhiteSpace($line)) {
            Flush-ParagraphBuffer
            $index++
            continue
        }
        if ($line -match '^###\s+(.+)$') {
            Flush-ParagraphBuffer
            Add-Paragraph $selection $Matches[1] 'Heading 2'
            $index++
            continue
        }
        if ($line -match '^##\s+(.+)$') {
            Flush-ParagraphBuffer
            Add-Paragraph $selection $Matches[1] 'Heading 1'
            $index++
            continue
        }
        if ($line -match '^\s*\|') {
            Flush-ParagraphBuffer
            $tableRows = @()
            while ($index -lt $source.Count -and $source[$index] -match '^\s*\|') {
                if (-not (Is-TableSeparator $source[$index])) {
                    $tableRows += ,(Parse-TableRow $source[$index])
                }
                $index++
            }
            Add-Table $document $selection $tableRows $true
            continue
        }
        if ($line -match '^\s*-\s+(.+)$') {
            Flush-ParagraphBuffer
            $selection.Style = 'List Bullet'
            $selection.Font.Name = 'Aptos'
            $selection.Font.Size = 10.5
            $selection.Font.Color = To-Rgb '#243936'
            $selection.TypeText((Clean-Markdown $Matches[1]))
            $selection.TypeParagraph()
            $index++
            continue
        }
        if ($line -match '^\s*\d+\.\s+(.+)$') {
            Flush-ParagraphBuffer
            $selection.Style = 'List Number'
            $selection.Font.Name = 'Aptos'
            $selection.Font.Size = 10.5
            $selection.Font.Color = To-Rgb '#243936'
            $selection.TypeText((Clean-Markdown $Matches[1]))
            $selection.TypeParagraph()
            $index++
            continue
        }
        $paragraphBuffer.Add($line.Trim())
        $index++
    }
    Flush-ParagraphBuffer

    # Apply additional polish.
    foreach ($table in $document.Tables) {
        $table.Range.ParagraphFormat.KeepTogether = 0
    }
    $toc.Update()
    $document.Fields.Update() | Out-Null
    $document.Repaginate()

    $document.SaveAs2($resolvedOutput, 16)
    Write-Output $resolvedOutput
}
finally {
    if ($null -ne $document) {
        $document.Close(0)
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    }
    if ($null -ne $word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
