param(
    [string]$Profile = 'sandbox38',
    [string]$Region = 'ap-southeast-1',
    [string]$LocalImage = 'smewise-server:20261019',
    [string]$ImageTag = ('release-' + (Get-Date -Format 'yyyyMMddHHmmss'))
)
$ErrorActionPreference = 'Stop'
$env:AWS_PAGER = ''
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

function Invoke-Aws {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $result = & aws @Arguments --profile $Profile --region $Region --no-cli-pager
    if ($LASTEXITCODE -ne 0) { throw "AWS operation failed: $($Arguments[0]) $($Arguments[1])" }
    return $result
}

$identity = (Invoke-Aws @('sts', 'get-caller-identity', '--output', 'json')) | ConvertFrom-Json
if ($identity.Account -ne '781897846709') { throw 'Refusing to deploy outside approved Sandbox-38.' }
if ($Region -ne 'ap-southeast-1') { throw 'This template is approved and configured for Singapore.' }

$registry = "$($identity.Account).dkr.ecr.$Region.amazonaws.com"
$imageUri = "${registry}/smewise-server:${ImageTag}"
$repository = (Invoke-Aws @('ecr', 'describe-repositories', '--repository-names', 'smewise-server', '--output', 'json')) | ConvertFrom-Json
if (-not $repository.repositories) { throw 'The dedicated ECR repository must exist before deployment.' }

& docker image inspect $LocalImage --format '{{.Id}}'
if ($LASTEXITCODE -ne 0) { throw 'Build the backend image before deploying.' }
$password = Invoke-Aws @('ecr', 'get-login-password')
$password | & docker login --username AWS --password-stdin $registry
$password = $null
if ($LASTEXITCODE -ne 0) { throw 'ECR Docker sign-in failed.' }
& docker tag $LocalImage $imageUri
if ($LASTEXITCODE -ne 0) { throw 'Image tagging failed.' }
& docker push $imageUri
if ($LASTEXITCODE -ne 0) { throw 'Image upload failed.' }

$stack = 'smewise-hosting'
$template = Join-Path $PSScriptRoot 'hosting.yaml'
Invoke-Aws @('cloudformation', 'deploy', '--stack-name', $stack, '--template-file', $template,
    '--capabilities', 'CAPABILITY_IAM', '--parameter-overrides', "ImageUri=$imageUri",
    '--no-fail-on-empty-changeset')
$description = (Invoke-Aws @('cloudformation', 'describe-stacks', '--stack-name', $stack, '--output', 'json')) | ConvertFrom-Json
$outputs = @{}
foreach ($entry in $description.Stacks[0].Outputs) { $outputs[$entry.OutputKey] = $entry.OutputValue }
if (-not $outputs.WebsiteBucket -or -not $outputs.WebsiteUrl) { throw 'Hosting stack outputs are incomplete.' }

Invoke-Aws @('s3', 'sync', 'client/dist', "s3://$($outputs.WebsiteBucket)", '--exclude', 'index.html', '--cache-control', 'public,max-age=31536000,immutable')
Invoke-Aws @('s3', 'cp', 'client/dist/index.html', "s3://$($outputs.WebsiteBucket)/index.html", '--cache-control', 'no-cache', '--content-type', 'text/html')
Invoke-Aws @('cloudformation', 'deploy', '--stack-name', $stack, '--template-file', $template,
    '--capabilities', 'CAPABILITY_IAM', '--parameter-overrides', "ImageUri=$imageUri", "FrontendOrigin=$($outputs.WebsiteUrl)",
    '--no-fail-on-empty-changeset')
Invoke-Aws @('cloudfront', 'create-invalidation', '--distribution-id', $outputs.DistributionId, '--paths', '/*')
$outputs.ImageUri = $imageUri
$outputs.StackName = $stack
$outputs.Region = $Region
$outputs | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'deployed-resources.json')
Write-Output "Hosting created. Verification still required: $($outputs.WebsiteUrl)"
