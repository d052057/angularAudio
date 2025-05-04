$directoryPath = Read-Host "Enter the directory path to scan for audio files"
$outputPath = Read-Host "Enter the output path for the JSON file (e.g., C:\audio_files.json)"

$audioFiles = Get-ChildItem -Path $directoryPath -Recurse -Include *.mp3, *.wav, *.flac, *.ogg -File

$audioData = @()
foreach ($file in $audioFiles) {
    $audioData += [PSCustomObject]@{
        url = "/assets/musics/" + $file.Name
        title = $file.Name
    }
}

$json = $audioData | ConvertTo-Json -Compress

try {
    Set-Content -Path $outputPath -Value $json -Encoding UTF8 -ErrorAction Stop
    Write-Host "JSON file created successfully at: $outputPath"
} catch {
    Write-Error "Failed to create JSON file: $($_.Exception.Message)"
}