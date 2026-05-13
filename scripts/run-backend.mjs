import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'server')
const managePy = path.join(serverDir, 'manage.py')

function resolvePython() {
  const localCandidates = process.platform === 'win32'
    ? [path.join(serverDir, '.venv', 'Scripts', 'python.exe')]
    : [path.join(serverDir, '.venv', 'bin', 'python')]

  for (const candidate of localCandidates) {
    if (existsSync(candidate)) {
      return { command: candidate, prefix: [] }
    }
  }

  const commandCandidates = process.platform === 'win32'
    ? [
        { command: 'py', prefix: ['-3'] },
        { command: 'python', prefix: [] },
      ]
    : [
        { command: 'python3', prefix: [] },
        { command: 'python', prefix: [] },
      ]

  for (const candidate of commandCandidates) {
    const check = spawnSync(candidate.command, [...candidate.prefix, '--version'], { stdio: 'ignore' })
    if (check.status === 0) {
      return candidate
    }
  }

  return null
}

const python = resolvePython()

if (!python) {
  console.error('Python не найден. Установите Python 3.10+ и выполните `npm run setup`.')
  process.exit(1)
}

const args = process.argv.slice(2)
const manageArgs = args.length > 0 ? args : ['runserver', '127.0.0.1:8000']
const isRunserverCommand = manageArgs[0] === 'runserver'

function runManageSync(extraArgs) {
  const result = spawnSync(
    python.command,
    [...python.prefix, managePy, ...extraArgs],
    {
      cwd: rootDir,
      stdio: 'inherit',
    }
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (isRunserverCommand) {
  console.log('Синхронизирую базу данных...')
  runManageSync(['migrate', '--noinput'])
}

const child = spawn(
  python.command,
  [...python.prefix, managePy, ...manageArgs],
  {
    cwd: rootDir,
    stdio: 'inherit',
  }
)

child.on('exit', code => {
  process.exit(code ?? 0)
})
