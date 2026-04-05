import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const serverDir = path.join(rootDir, 'server')
const managePy = path.join(serverDir, 'manage.py')
const requirements = path.join(serverDir, 'requirements.txt')
const venvPython = process.platform === 'win32'
  ? path.join(serverDir, '.venv', 'Scripts', 'python.exe')
  : path.join(serverDir, '.venv', 'bin', 'python')

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function detectSystemPython() {
  const candidates = process.platform === 'win32'
    ? [
        { command: 'py', prefix: ['-3'] },
        { command: 'python', prefix: [] },
      ]
    : [
        { command: 'python3', prefix: [] },
        { command: 'python', prefix: [] },
      ]

  for (const candidate of candidates) {
    const check = spawnSync(candidate.command, [...candidate.prefix, '--version'], { stdio: 'ignore' })
    if (check.status === 0) return candidate
  }

  return null
}

const python = detectSystemPython()

if (!python) {
  console.error('Python 3.10+ не найден. Установите Python и повторите `npm run setup`.')
  process.exit(1)
}

if (!existsSync(venvPython)) {
  console.log('Создаю виртуальное окружение в server/.venv...')
  run(python.command, [...python.prefix, '-m', 'venv', path.join(serverDir, '.venv')])
}

console.log('Ставлю зависимости для сервера...')
run(venvPython, ['-m', 'pip', 'install', '-r', requirements])

console.log('Применяю миграции...')
run(venvPython, [managePy, 'migrate'])

console.log('Готово. Теперь можно запускать `npm run dev:all`.')
