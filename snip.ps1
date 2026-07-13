$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $scriptDir "cli.js") @args
exit $LASTEXITCODE
