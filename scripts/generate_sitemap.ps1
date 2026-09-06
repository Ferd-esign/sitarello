$baseUrl = "https://ferdinandovirno.it"
$baseDir = "c:\Users\pcdoc\Desktop\redesign PORTFOLIO SITO\REDEISGN_v5-sperimentazioni"
$progettiPath = Join-Path $baseDir "Progetti\progetti-data.json"
$archivioPath = Join-Path $baseDir "Progetti\Archivio\archivio-data.json"
$publicDir = Join-Path $baseDir "public"

if (-not (Test-Path $publicDir)) {
    New-Item -ItemType Directory -Path $publicDir | Out-Null
}

$today = (Get-Date).ToString("yyyy-MM-dd")

$urls = @(
    @{ loc = "$baseUrl/"; priority = "1.0" },
    @{ loc = "$baseUrl/#/esplora"; priority = "0.9" },
    @{ loc = "$baseUrl/#/archivio"; priority = "0.8" },
    @{ loc = "$baseUrl/#/contatti"; priority = "0.8" }
)

if (Test-Path $progettiPath) {
    $progetti = Get-Content $progettiPath -Raw | ConvertFrom-Json
    foreach ($p in $progetti) {
        $urls += @{ loc = "$baseUrl/#/progetto/$($p.id)"; priority = "0.9" }
        if ($null -ne $p.sottoprogetti) {
            foreach ($sub in $p.sottoprogetti) {
                $urls += @{ loc = "$baseUrl/#/progetto/$($sub.id)"; priority = "0.8" }
            }
        }
    }
}

if (Test-Path $archivioPath) {
    $archivio = Get-Content $archivioPath -Raw | ConvertFrom-Json
    foreach ($p in $archivio) {
        $urls += @{ loc = "$baseUrl/#/archivio/$($p.id)"; priority = "0.7" }
        if ($null -ne $p.sottoprogetti) {
            foreach ($sub in $p.sottoprogetti) {
                $urls += @{ loc = "$baseUrl/#/archivio/$($sub.id)"; priority = "0.6" }
            }
        }
    }
}

$xml = "<?xml version=""1.0"" encoding=""UTF-8""?>`n<urlset xmlns=""http://www.sitemaps.org/schemas/sitemap/0.9"">`n"
foreach ($u in $urls) {
    $xml += "  <url>`n"
    $xml += "    <loc>$($u.loc)</loc>`n"
    $xml += "    <lastmod>$today</lastmod>`n"
    $xml += "    <priority>$($u.priority)</priority>`n"
    $xml += "  </url>`n"
}
$xml += "</urlset>"

$xml | Set-Content -Path (Join-Path $publicDir "sitemap.xml") -Encoding UTF8
Write-Output "sitemap.xml generato con successo in public/"
