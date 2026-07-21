import { execSync } from 'child_process';

console.log('=== STUCK PROCESS MONITOR ===\\n');
console.log('Scanning for potentially orphaned scraping processes (Node, Chrome, Firefox)...\\n');

try {
  const psCommand = `
    $procs = Get-Process | Where-Object { $_.ProcessName -match 'node|chrome|firefox' }
    if ($procs) {
      $procs | Select-Object Id, ProcessName, 
        @{Name="MemoryMB"; Expression={[math]::Round($_.WorkingSet / 1MB, 2)}},
        @{Name="CPU"; Expression={$_.CPU}},
        StartTime |
      ConvertTo-Json
    } else {
      "[]"
    }
  `;
  
  const output = execSync(`powershell -NoProfile -Command "${psCommand}"`, { encoding: 'utf-8' });
  
  if (!output.trim()) {
    console.log('✅ No Node or browser processes found.');
    process.exit(0);
  }

  const rawProcesses = JSON.parse(output);
  const processes = Array.isArray(rawProcesses) ? rawProcesses : [rawProcesses];
  
  const now = new Date().getTime();
  let foundStuck = false;

  console.log(
    'PID'.padEnd(10) + 
    'NAME'.padEnd(15) + 
    'MEMORY (MB)'.padEnd(15) + 
    'RUNTIME (mins)'.padEnd(15) + 
    'STATUS'
  );
  console.log('-'.repeat(70));

  for (const proc of processes) {
    if (!proc.StartTime) continue;
    
    let startTimeStr = proc.StartTime;
    // Fix Regex parsing
    if (typeof startTimeStr === 'string' && startTimeStr.includes('/Date(')) {
      const numStr = startTimeStr.replace('/Date(', '').replace(')/', '');
      startTimeStr = parseInt(numStr, 10);
    }
    
    const startTime = new Date(startTimeStr).getTime();
    const runtimeMins = Math.round((now - startTime) / 60000);
    
    let status = '🟢 OK';
    if (runtimeMins > 60) {
      status = '🔴 LIKELY STUCK (>60m)';
      foundStuck = true;
    }

    console.log(
      proc.Id.toString().padEnd(10) +
      proc.ProcessName.padEnd(15) +
      proc.MemoryMB.toString().padEnd(15) +
      runtimeMins.toString().padEnd(15) +
      status
    );
  }

  console.log('\\n----------------------------------------------------------------------');
  if (foundStuck) {
    console.log('⚠️ WARNING: Found processes running for over 60 minutes.');
    console.log('To kill a stuck process, run: Stop-Process -Id <PID> -Force');
  } else {
    console.log('✅ System health is optimal. No processes look orphaned.');
  }

} catch (error: any) {
  console.error('Error fetching process list:', error.message);
}
