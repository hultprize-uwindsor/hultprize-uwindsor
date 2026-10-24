import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const root = new URL('../', import.meta.url)
const events = JSON.parse(await readFile(new URL('shared/attendance-events.json', root), 'utf8'))
const path = new URL('google-apps-script/Attendance.gs', root)
const source = await readFile(path, 'utf8')
const block = `// BEGIN GENERATED ATTENDANCE EVENT SEED\nfunction attendanceEventSeed_() { return ${JSON.stringify(events, null, 2)}; }\n// END GENERATED ATTENDANCE EVENT SEED`
const output = source.replace(/\/\/ BEGIN GENERATED ATTENDANCE EVENT SEED[\s\S]*?\/\/ END GENERATED ATTENDANCE EVENT SEED/, block)
if (process.argv.includes('--check')) {
  if (source !== output) { console.error('Attendance seed differs. Run node scripts/sync-attendance-seed.mjs.'); process.exitCode = 1 }
  else console.log('Attendance seed matches shared/attendance-events.json.')
} else {
  await writeFile(path, output)
  console.log(`Updated ${fileURLToPath(path)} event seed. Existing deployed event records are preserved by setupAttendance().`)
}
