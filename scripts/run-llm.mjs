import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const binaryPath = process.env.LLAMA_SERVER_BIN
  || path.join(rootDir, 'llm', 'runtime', 'llama.cpp', 'build', 'bin', 'llama-server')
const modelPath = process.env.LLM_MODEL_PATH
  || path.join(rootDir, 'llm', 'models', 'gemma-3-1b-it-Q5_K_M.gguf')

if (!existsSync(binaryPath)) {
  console.error(`Не найден llama-server: ${binaryPath}`)
  console.error('Укажите путь через LLAMA_SERVER_BIN или соберите llama.cpp локально.')
  process.exit(1)
}

if (!existsSync(modelPath)) {
  console.error(`Не найдена модель: ${modelPath}`)
  console.error('Укажите путь через LLM_MODEL_PATH или скачайте GGUF-модель локально.')
  process.exit(1)
}

const host = process.env.LLM_HOST || '127.0.0.1'
const port = process.env.LLM_PORT || '8080'

const child = spawn(
  binaryPath,
  [
    '-m', modelPath,
    '--host', host,
    '--port', port,
    '--no-ui',
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
  }
)

child.on('exit', code => {
  process.exit(code ?? 0)
})
