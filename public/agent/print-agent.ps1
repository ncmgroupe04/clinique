# ============================================================================
#  Agent d'impression local - tickets thermiques ESC/POS
#  ---------------------------------------------------------------------------
#  Ecoute uniquement sur 127.0.0.1 et recoit les octets ESC/POS de
#  l'application web, puis les envoie directement a la file d'impression
#  Windows en mode RAW. Le pilote installe n'est jamais utilise : les
#  commandes TSPL/ZPL d'un mauvais pilote ne peuvent donc plus apparaitre.
#
#  Aucune installation, aucun droit administrateur, aucune dependance.
#  Configuration : agent-config.json (cree au premier lancement).
# ============================================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:Version = "1.0.0"
$script:MaxBodyBytes = 2 * 1024 * 1024
$script:PrinterCache = $null
$script:PrinterCacheAt = [DateTime]::MinValue

# --- Configuration ----------------------------------------------------------

$configPath = Join-Path $scriptDir "agent-config.json"
$config = @{
  port    = 9100
  origins = @(
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ticketordonnance.vercel.app"
  )
  printer = ""
}

if (Test-Path $configPath) {
  try {
    $loaded = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($null -ne $loaded.port) { $config.port = [int]$loaded.port }
    if ($null -ne $loaded.origins) { $config.origins = @($loaded.origins) }
    if ($null -ne $loaded.printer) { $config.printer = [string]$loaded.printer }
  }
  catch {
    Write-Host "agent-config.json illisible : valeurs par defaut utilisees." -ForegroundColor Yellow
  }
}
else {
  $defaultConfig = @"
{
  "port": 9100,
  "origins": [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ticketordonnance.vercel.app"
  ],
  "printer": ""
}
"@
  Set-Content -Path $configPath -Value $defaultConfig -Encoding UTF8
  Write-Host "Fichier de configuration cree : agent-config.json" -ForegroundColor Green
}

$config.origins = @($config.origins | ForEach-Object { ([string]$_).TrimEnd("/") })

# --- API Windows (winspool.drv) ---------------------------------------------

Add-Type -Namespace Win32 -Name Spool -MemberDefinition @'
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct DOC_INFO_1 {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDatatype;
}

[DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

[DllImport("winspool.drv", SetLastError = true)]
public static extern bool ClosePrinter(IntPtr hPrinter);

[DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
public static extern int StartDocPrinter(IntPtr hPrinter, int level, ref DOC_INFO_1 pDocInfo);

[DllImport("winspool.drv", SetLastError = true)]
public static extern bool EndDocPrinter(IntPtr hPrinter);

[DllImport("winspool.drv", SetLastError = true)]
public static extern bool StartPagePrinter(IntPtr hPrinter);

[DllImport("winspool.drv", SetLastError = true)]
public static extern bool EndPagePrinter(IntPtr hPrinter);

[DllImport("winspool.drv", SetLastError = true)]
public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
'@

# --- Helpers ----------------------------------------------------------------

function Get-PrinterList {
  if ($null -ne $script:PrinterCache -and ([DateTime]::UtcNow - $script:PrinterCacheAt).TotalSeconds -lt 5) {
    return $script:PrinterCache
  }

  $list = @()
  try {
    $list = @(Get-Printer -ErrorAction Stop | ForEach-Object {
      [pscustomobject]@{
        name   = [string]$_.Name
        port   = [string]$_.PortName
        driver = [string]$_.DriverName
      }
    })
  }
  catch {
    try {
      $list = @(Get-CimInstance Win32_Printer -ErrorAction Stop | ForEach-Object {
        [pscustomobject]@{
          name   = [string]$_.Name
          port   = [string]$_.PortName
          driver = [string]$_.DriverName
        }
      })
    }
    catch {
      $list = @()
    }
  }

  $script:PrinterCache = $list
  $script:PrinterCacheAt = [DateTime]::UtcNow
  return $list
}

function Get-PrinterNames {
  return @(Get-PrinterList | ForEach-Object { $_.name })
}

function Get-DefaultPrinterName {
  try {
    $default = Get-CimInstance Win32_Printer -ErrorAction Stop |
      Where-Object { $_.Default } |
      Select-Object -First 1
    if ($default) { return [string]$default.Name }
  }
  catch { }

  $names = @(Get-PrinterNames)
  if ($names.Count -gt 0) { return $names[0] }
  return $null
}

function Send-RawBytes {
  param(
    [string]$PrinterName,
    [byte[]]$Data,
    [string]$DocumentName
  )

  $handle = [IntPtr]::Zero
  if (-not [Win32.Spool]::OpenPrinter($PrinterName, [ref]$handle, [IntPtr]::Zero)) {
    throw "OpenPrinter a echoue pour '$PrinterName' (code $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
  }

  try {
    $info = New-Object Win32.Spool+DOC_INFO_1
    $info.pDocName = $DocumentName
    $info.pDatatype = "RAW"
    $info.pOutputFile = $null

    if ([Win32.Spool]::StartDocPrinter($handle, 1, [ref]$info) -eq 0) {
      throw "StartDocPrinter a echoue (code $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
    }

    try {
      if (-not [Win32.Spool]::StartPagePrinter($handle)) {
        throw "StartPagePrinter a echoue (code $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
      }

      try {
        $written = 0
        $ok = [Win32.Spool]::WritePrinter($handle, $Data, $Data.Length, [ref]$written)
        if (-not $ok -or $written -ne $Data.Length) {
          throw "WritePrinter a echoue (code $([Runtime.InteropServices.Marshal]::GetLastWin32Error()))."
        }
      }
      finally {
        [void][Win32.Spool]::EndPagePrinter($handle)
      }
    }
    finally {
      [void][Win32.Spool]::EndDocPrinter($handle)
    }
  }
  finally {
    [void][Win32.Spool]::ClosePrinter($handle)
  }
}

function Find-HeaderEnd {
  param([byte[]]$Bytes)

  for ($i = 0; $i -le $Bytes.Length - 4; $i++) {
    if ($Bytes[$i] -eq 13 -and $Bytes[$i + 1] -eq 10 -and $Bytes[$i + 2] -eq 13 -and $Bytes[$i + 3] -eq 10) {
      return $i
    }
  }
  return -1
}

function Get-HeaderValue {
  param([string[]]$Lines, [string]$Name)

  foreach ($line in $Lines) {
    $separator = $line.IndexOf(":")
    if ($separator -lt 1) { continue }
    if ($line.Substring(0, $separator).Trim() -ieq $Name) {
      return $line.Substring($separator + 1).Trim()
    }
  }
  return $null
}

function Send-Response {
  param(
    [System.IO.Stream]$Stream,
    [int]$Status,
    [string]$Reason,
    [string]$Body,
    [string]$CorsOrigin
  )

  if ($null -eq $Body) { $Body = "" }
  $bodyBytes = [Text.Encoding]::UTF8.GetBytes($Body)

  $header = "HTTP/1.1 $Status $Reason`r`n"
  $header += "Content-Type: application/json; charset=utf-8`r`n"
  $header += "Content-Length: $($bodyBytes.Length)`r`n"
  $header += "Connection: close`r`n"
  $header += "Cache-Control: no-store`r`n"
  if ($CorsOrigin) {
    $header += "Access-Control-Allow-Origin: $CorsOrigin`r`n"
    $header += "Access-Control-Allow-Methods: GET, POST, OPTIONS`r`n"
    $header += "Access-Control-Allow-Headers: Content-Type, X-Printer-Name`r`n"
    $header += "Access-Control-Allow-Private-Network: true`r`n"
    $header += "Access-Control-Max-Age: 600`r`n"
    $header += "Vary: Origin`r`n"
  }
  $header += "`r`n"

  $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($bodyBytes.Length -gt 0) {
    $Stream.Write($bodyBytes, 0, $bodyBytes.Length)
  }
  $Stream.Flush()
}

function Write-Json {
  param(
    [System.IO.Stream]$Stream,
    [int]$Status,
    [string]$Reason,
    [object]$Payload,
    [string]$CorsOrigin
  )

  $json = ConvertTo-Json -InputObject $Payload -Compress -Depth 4
  Send-Response -Stream $Stream -Status $Status -Reason $Reason -Body $json -CorsOrigin $CorsOrigin
}

function Handle-Client {
  param([System.Net.Sockets.TcpClient]$Client)

  $stream = $Client.GetStream()
  $Client.ReceiveTimeout = 15000
  $buffer = New-Object byte[] 16384
  $memory = New-Object System.IO.MemoryStream

  $headerEnd = -1
  try {
    while ($true) {
      $read = $stream.Read($buffer, 0, $buffer.Length)
      if ($read -le 0) { return }
      $memory.Write($buffer, 0, $read)

      $all = $memory.ToArray()
      $headerEnd = Find-HeaderEnd $all
      if ($headerEnd -ge 0) { break }
      if ($all.Length -gt 65536) {
        Send-Response -Stream $stream -Status 431 -Reason "Request Header Fields Too Large" -Body '{"ok":false}' -CorsOrigin $null
        return
      }
    }

    $all = $memory.ToArray()
    $headerText = [Text.Encoding]::ASCII.GetString($all, 0, $headerEnd)
    $lines = $headerText -split "`r`n"
    $requestParts = $lines[0] -split " "
    if ($requestParts.Length -lt 3) {
      Send-Response -Stream $stream -Status 400 -Reason "Bad Request" -Body '{"ok":false}' -CorsOrigin $null
      return
    }

    $method = $requestParts[0].ToUpperInvariant()
    $target = $requestParts[1]
    $path = ($target -split "\?")[0]

    $origin = Get-HeaderValue -Lines $lines -Name "Origin"
    $corsOrigin = $null
    if ($origin) {
      $normalized = $origin.TrimEnd("/")
      if ($config.origins -notcontains $normalized) {
        Send-Response -Stream $stream -Status 403 -Reason "Forbidden" -Body '{"ok":false,"error":"origin not allowed"}' -CorsOrigin $null
        return
      }
      $corsOrigin = $origin
    }

    if ($method -eq "OPTIONS") {
      Send-Response -Stream $stream -Status 204 -Reason "No Content" -Body "" -CorsOrigin $corsOrigin
      return
    }

    if ($method -eq "GET" -and $path -eq "/health") {
      $printers = @(Get-PrinterList)
      $payload = @{
        ok             = $true
        name           = "print-agent"
        version        = $script:Version
        printers       = @($printers)
        defaultPrinter = Get-DefaultPrinterName
      }
      Write-Json -Stream $stream -Status 200 -Reason "OK" -Payload $payload -CorsOrigin $corsOrigin
      return
    }

    if ($method -eq "POST" -and $path -eq "/print") {
      $contentLength = 0
      $rawLength = Get-HeaderValue -Lines $lines -Name "Content-Length"
      if ($rawLength) {
        if (-not [int]::TryParse($rawLength, [ref]$contentLength) -or $contentLength -lt 0) {
          Send-Response -Stream $stream -Status 400 -Reason "Bad Request" -Body '{"ok":false,"error":"invalid content-length"}' -CorsOrigin $corsOrigin
          return
        }
      }

      if ($contentLength -gt $script:MaxBodyBytes) {
        Send-Response -Stream $stream -Status 413 -Reason "Payload Too Large" -Body '{"ok":false,"error":"payload too large"}' -CorsOrigin $corsOrigin
        return
      }

      $bodyStart = $headerEnd + 4
      while (($memory.Length - $bodyStart) -lt $contentLength) {
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { break }
        $memory.Write($buffer, 0, $read)
      }

      $all = $memory.ToArray()
      $available = $all.Length - $bodyStart
      if ($contentLength -le 0 -or $available -lt $contentLength) {
        Send-Response -Stream $stream -Status 400 -Reason "Bad Request" -Body '{"ok":false,"error":"empty body"}' -CorsOrigin $corsOrigin
        return
      }

      $body = New-Object byte[] $contentLength
      [Array]::Copy($all, $bodyStart, $body, 0, $contentLength)

      $printerName = Get-HeaderValue -Lines $lines -Name "X-Printer-Name"
      if (-not $printerName) { $printerName = $config.printer }
      if (-not $printerName) { $printerName = Get-DefaultPrinterName }

      if (-not $printerName) {
        Send-Response -Stream $stream -Status 500 -Reason "Internal Server Error" -Body '{"ok":false,"error":"no printer available"}' -CorsOrigin $corsOrigin
        return
      }

      $known = @(Get-PrinterNames)
      if ($known.Count -gt 0 -and $known -notcontains $printerName) {
        $escaped = $printerName.Replace('\', '\\').Replace('"', '\"')
        Send-Response -Stream $stream -Status 404 -Reason "Not Found" -Body "{`"ok`":false,`"error`":`"unknown printer: $escaped`"}" -CorsOrigin $corsOrigin
        return
      }

      try {
        Send-RawBytes -PrinterName $printerName -Data $body -DocumentName "Ticket"
      }
      catch {
        $message = $_.Exception.Message.Replace('\', '\\').Replace('"', '\"')
        Send-Response -Stream $stream -Status 500 -Reason "Internal Server Error" -Body "{`"ok`":false,`"error`":`"$message`"}" -CorsOrigin $corsOrigin
        return
      }

      $payload = @{ ok = $true; printer = $printerName; bytes = $contentLength }
      Write-Host ("Imprime {0} octets sur {1}" -f $contentLength, $printerName) -ForegroundColor DarkGray
      Write-Json -Stream $stream -Status 200 -Reason "OK" -Payload $payload -CorsOrigin $corsOrigin
      return
    }

    Send-Response -Stream $stream -Status 404 -Reason "Not Found" -Body '{"ok":false,"error":"not found"}' -CorsOrigin $corsOrigin
  }
  finally {
    try { $memory.Dispose() } catch { }
  }
}

# --- Boucle principale ------------------------------------------------------

$listener = $null
try {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $config.port)
  $listener.Start()

  Write-Host ""
  Write-Host "  Agent d'impression demarre" -ForegroundColor Green
  Write-Host ("  Adresse   : http://127.0.0.1:{0}" -f $config.port)
  Write-Host ("  Origines  : {0}" -f ($config.origins -join ", "))
  $defaultName = Get-DefaultPrinterName
  if ($defaultName) { Write-Host ("  Imprimante par defaut : {0}" -f $defaultName) }
  Write-Host ""
  Write-Host "  Laissez cette fenetre ouverte. Ctrl+C pour arreter." -ForegroundColor Yellow
  Write-Host ""

  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      Handle-Client -Client $client
    }
    catch {
      Write-Host ("Erreur de traitement : {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
    finally {
      try { $client.Close() } catch { }
    }
  }
}
catch [System.Net.Sockets.SocketException] {
  Write-Host ""
  Write-Host ("Impossible d'ecouter sur le port {0} : {1}" -f $config.port, $_.Exception.Message) -ForegroundColor Red
  Write-Host "Le port est peut-etre deja utilise (agent deja lance ?)." -ForegroundColor Yellow
  exit 1
}
finally {
  if ($listener) { $listener.Stop() }
}
