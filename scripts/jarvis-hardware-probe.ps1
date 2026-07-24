$ErrorActionPreference = 'SilentlyContinue'

function Has-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$computer = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$gpu = Get-CimInstance Win32_VideoController | Select-Object Name, AdapterRAM, DriverVersion
$driveD = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='D:'"

$nvidia = $null
if (Has-Command 'nvidia-smi') {
  $nvidiaRaw = nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader,nounits
  if ($LASTEXITCODE -eq 0 -and $nvidiaRaw) {
    $parts = $nvidiaRaw[0].Split(',').Trim()
    $nvidia = [ordered]@{ name = $parts[0]; vramMb = [int]$parts[1]; driver = $parts[2] }
  }
}

$ramGb = [math]::Round($computer.TotalPhysicalMemory / 1GB, 1)
$freeRamGb = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$freeDGb = if ($driveD) { [math]::Round($driveD.FreeSpace / 1GB, 1) } else { 0 }

$runtime = [ordered]@{
  node = if (Has-Command 'node') { (node --version) } else { $null }
  bun = if (Has-Command 'bun') { (bun --version) } else { $null }
  python = if (Has-Command 'python') { (python --version 2>&1) } else { $null }
  git = if (Has-Command 'git') { (git --version) } else { $null }
  docker = Has-Command 'docker'
  wsl = Has-Command 'wsl'
  ollama = if (Has-Command 'ollama') { (ollama --version 2>&1) } else { $null }
  ffmpeg = Has-Command 'ffmpeg'
}

$profiles = [ordered]@{
  jarvisCore = ($ramGb -ge 8 -and ($runtime.node -or $runtime.bun) -and $freeDGb -ge 10)
  standardServices = ($ramGb -ge 16 -and $freeDGb -ge 40 -and ($runtime.docker -or $runtime.wsl))
  heavyAgents = ($ramGb -ge 32 -and $freeDGb -ge 100 -and ($runtime.docker -or $runtime.wsl))
  localGpuMedia = ($nvidia -and $nvidia.vramMb -ge 8192 -and $ramGb -ge 16)
  largeGpuMedia = ($nvidia -and $nvidia.vramMb -ge 16384 -and $ramGb -ge 32)
}

$result = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  machine = [ordered]@{
    os = $os.Caption
    architecture = $os.OSArchitecture
    cpu = $cpu.Name
    logicalProcessors = $computer.NumberOfLogicalProcessors
    ramGb = $ramGb
    freeRamGb = $freeRamGb
    freeDiskDGb = $freeDGb
    gpu = $gpu
    nvidia = $nvidia
  }
  runtimes = $runtime
  compatibility = $profiles
  recommendations = @(
    if (-not $driveD) { 'Create or mount D: before installing managed services.' }
    if (-not ($runtime.node -or $runtime.bun)) { 'Install Node.js 20+ or Bun.' }
    if (-not $runtime.git) { 'Install Git for Windows.' }
    if (-not $runtime.ollama) { 'Install Ollama only when local models are required.' }
    if (-not ($runtime.docker -or $runtime.wsl)) { 'Use native adapters only; keep OpenHands, BuildingAI, n8n, Penpot and Dokploy disabled.' }
    if (-not $profiles.localGpuMedia) { 'Use remote GPU workers for LivePortrait, Personalive and OpenMontage.' }
  )
}

$outDir = Join-Path $PSScriptRoot '..\reports'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outFile = Join-Path $outDir 'hardware-compatibility.json'
$result | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $outFile
$result | ConvertTo-Json -Depth 8
Write-Host "Saved: $outFile"
