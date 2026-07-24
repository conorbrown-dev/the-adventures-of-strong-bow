$ErrorActionPreference = "Stop"

$RawDir = Join-Path $PSScriptRoot "..\resources\raw"
New-Item -ItemType Directory -Force -Path $RawDir | Out-Null

function Download-Source {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$FileName
    )

    $Destination = Join-Path $RawDir $FileName
    Write-Host "Downloading $FileName..."
    Invoke-WebRequest -Uri $Url -OutFile $Destination
}

# The machine-readable K-5 dataset is already vendored in the repository.
# These are official human-review and licensing references only.
Download-Source `
    -Url "https://corestandards.org/wp-content/uploads/2023/09/Math_Standards1.pdf" `
    -FileName "Math_Standards1.pdf"

Download-Source `
    -Url "https://corestandards.org/wp-content/uploads/2023/09/ELA_Standards1.pdf" `
    -FileName "ELA_Standards1.pdf"

Download-Source `
    -Url "https://www.thecorestandards.org/public-license/" `
    -FileName "common-core-public-license.html"

Write-Host "Official reference resources downloaded to $RawDir"
Write-Host "The standards importer must use data/curriculum/generated/common-core-k5-standards.json."
