param(
    [string]$Conda = 'D:\Resources\runtimes\ml-runtime\miniforge3\Scripts\conda.exe'
)
$ErrorActionPreference = 'Stop'
$experimentRoot = $PSScriptRoot
$env:CONDA_PKGS_DIRS = Join-Path $experimentRoot 'cache\conda-pkgs'
$env:CONDA_ENVS_PATH = Join-Path $experimentRoot 'cache\conda-envs'
$env:PIP_CACHE_DIR = Join-Path $experimentRoot 'cache\pip'
$env:TEMP = Join-Path $experimentRoot 'tmp'
$env:TMP = $env:TEMP
New-Item -ItemType Directory -Force -Path $env:TEMP,$env:PIP_CACHE_DIR | Out-Null
$python = Join-Path $experimentRoot 'env\python.exe'
if (-not (Test-Path -LiteralPath $python)) {
    & $Conda create --yes --prefix (Join-Path $experimentRoot 'env') --override-channels --channel conda-forge python=3.12 pip
    if ($LASTEXITCODE -ne 0) { throw 'Conda environment creation failed' }
}
$torchWheel = Join-Path $experimentRoot 'cache\wheels\torch-2.10.0+cu128-cp312-cp312-win_amd64.whl'
if (-not (Test-Path -LiteralPath $torchWheel)) {
    & $python (Join-Path $experimentRoot 'fetch_torch.py')
    if ($LASTEXITCODE -ne 0) { throw 'Official PyTorch wheel download failed' }
}
& $python -m pip install $torchWheel torchvision==0.25.0 --index-url https://download.pytorch.org/whl/cu128 --progress-bar off
if ($LASTEXITCODE -ne 0) { throw 'PyTorch installation failed' }
$requirements = Join-Path $experimentRoot 'requirements-win64.lock.txt'
if (-not (Test-Path -LiteralPath $requirements)) {
    $requirements = Join-Path $experimentRoot 'requirements.txt'
}
& $python -m pip install -r $requirements --progress-bar off
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed' }
& $python (Join-Path $experimentRoot 'check_environment.py')
if ($LASTEXITCODE -ne 0) { throw 'Environment validation failed' }
& $python -m pip freeze | ForEach-Object { $_ -replace '^torch @ file:.*$', 'torch==2.10.0+cu128' } | Set-Content -LiteralPath (Join-Path $experimentRoot 'requirements-win64.lock.txt') -Encoding utf8
