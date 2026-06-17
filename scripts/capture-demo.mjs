import { spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const framesDir = join(root, 'assets', '.frames')
const assetsDir = join(root, 'assets')
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : '/usr/bin/google-chrome')

const URL = 'http://127.0.0.1:3456/demo/record.html'
const WIDTH = 720
const HEIGHT = 320
const FRAME_MS = 50

const textValues = ['Hello world', 'Hello there', 'Hi everyone', 'Hello world']
const plateValues = ['G-123-BB', 'G-456-BB', 'AB-12-CD', 'X-999-ZZ']

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with ${code}`))
    })
  })
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // retry
    }
    await sleep(250)
  }
  throw new Error(`Server not ready: ${url}`)
}

async function startServer() {
  const child = spawn('npx', ['--yes', 'serve', '.', '-p', '3456', '--no-clipboard'], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  })

  await waitForServer(URL)
  return () => {
    process.kill(-child.pid, 'SIGTERM')
  }
}

async function captureFrames(page) {
  await rm(framesDir, { recursive: true, force: true })
  await mkdir(framesDir, { recursive: true })

  let index = 0
  const shot = async () => {
    const file = join(framesDir, `frame-${String(index).padStart(4, '0')}.png`)
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } })
    index += 1
  }

  const burst = async (count) => {
    for (let i = 0; i < count; i += 1) {
      await shot()
      await sleep(FRAME_MS)
    }
  }

  const setValue = async (id, value) => {
    await page.evaluate(
      ({ elementId, next }) => {
        document.getElementById(elementId)?.setAttribute('value', next)
      },
      { elementId: id, next: value },
    )
  }

  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  await sleep(400)
  await burst(12)

  for (let cycle = 0; cycle < 2; cycle += 1) {
    for (const value of textValues.slice(1)) {
      await setValue('text', value)
      await burst(14)
    }
    for (const value of plateValues.slice(1)) {
      await setValue('plate', value)
      await burst(14)
    }
  }

  await burst(8)
  return index
}

async function encodeMedia(frameCount) {
  const pattern = join(framesDir, 'frame-%04d.png')
  const mp4 = join(assetsDir, 'demo.mp4')
  const gif = join(assetsDir, 'demo.gif')
  const fps = String(Math.round(1000 / FRAME_MS))

  await run('ffmpeg', [
    '-y',
    '-framerate',
    fps,
    '-i',
    pattern,
    '-frames:v',
    String(frameCount),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    mp4,
  ])

  await run('ffmpeg', [
    '-y',
    '-i',
    mp4,
    '-vf',
    'fps=12,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
    '-loop',
    '0',
    gif,
  ])
}

async function main() {
  const require = createRequire(import.meta.url)
  try {
    require.resolve('puppeteer-core')
  } catch {
    console.error('Run: npm install puppeteer-core --save-dev')
    process.exit(1)
  }

  await mkdir(assetsDir, { recursive: true })
  await run('npm', ['run', 'build'], { cwd: root })
  await run('cp', ['dist/element.js', 'demo/element.js'], { cwd: root, shell: true })

  const stopServer = await startServer()
  let browser
  try {
    browser = await puppeteer.launch({
      executablePath: chrome,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    })
    const page = await browser.newPage()
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    const frameCount = await captureFrames(page)
    await browser.close()
    browser = undefined
    await encodeMedia(frameCount)
  } finally {
    if (browser) await browser.close()
    stopServer()
    await rm(framesDir, { recursive: true, force: true })
  }

  console.log('Wrote assets/demo.mp4 and assets/demo.gif')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
