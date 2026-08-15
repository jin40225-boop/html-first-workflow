$ErrorActionPreference = "Stop"

$skills = @(
    @{
        Name = "ai-presentation-prompt-director"
        Repo = "https://github.com/jin40225-boop/ai-presentation-prompt-director-skill.git"
        SourceSubdir = "skills\ai-presentation-prompt-director"
    },
    @{
        Name = "activity-poster-director"
        Repo = "https://github.com/jin40225-boop/activity-poster-director-skill.git"
        SourceSubdir = "skills\activity-poster-director"
    }
)

$workRoot = Join-Path $env:TEMP "codex-skill-install"
$destRoot = Join-Path $env:USERPROFILE ".codex\skills"
New-Item -ItemType Directory -Force -Path $workRoot | Out-Null
New-Item -ItemType Directory -Force -Path $destRoot | Out-Null

foreach ($skill in $skills) {
    $checkout = Join-Path $workRoot ($skill.Name + "-repo")
    if (Test-Path -LiteralPath $checkout) {
        Remove-Item -LiteralPath $checkout -Recurse -Force
    }

    Write-Host "Cloning $($skill.Name)..."
    git clone $skill.Repo $checkout

    $source = Join-Path $checkout $skill.SourceSubdir
    $dest = Join-Path $destRoot $skill.Name

    if (-not (Test-Path -LiteralPath $source)) {
        throw "Skill source not found: $source"
    }

    if (Test-Path -LiteralPath $dest) {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $backup = Join-Path $destRoot "$($skill.Name).backup-$stamp"
        Move-Item -LiteralPath $dest -Destination $backup
        Write-Host "Backed up existing $($skill.Name) to: $backup"
    }

    Copy-Item -LiteralPath $source -Destination $dest -Recurse
    Write-Host "Installed $($skill.Name) to: $dest"
}

Write-Host "Done. Restart Codex to pick up the installed skills."
