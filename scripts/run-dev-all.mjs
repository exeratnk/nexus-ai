import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const frontendEntry = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')
const backendEntry = path.join(rootDir, 'scripts', 'run-backend.mjs')

const children = []
let shuttingDown = false
let exitCode = 0

function spawnChild(label, command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  })

  children.push(child)

  child.on('exit', code => {
    if (!shuttingDown) {
      exitCode = code ?? 0
      shutdown()
    }
  })

  child.on('error', error => {
    console.error(`[${label}] ${error.message}`)
    if (!shuttingDown) {
      exitCode = 1
      shutdown()
    }
  })

  return child
}

function signalChildren(signal) {
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill(signal)
      } catch {
      }
    }
  }
}

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  signalChildren('SIGINT')

  setTimeout(() => {
    signalChildren('SIGTERM')
  }, 1500).unref()

  setTimeout(() => {
    process.exit(exitCode)
  }, 2500).unref()
}

spawnChild('frontend', process.execPath, [frontendEntry])
spawnChild('backend', process.execPath, [backendEntry])

process.on('SIGINT', () => {
  exitCode = exitCode || 0
  shutdown()
})

process.on('SIGTERM', () => {
  exitCode = exitCode || 0
  shutdown()
})
