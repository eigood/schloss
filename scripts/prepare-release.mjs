import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Establish workspace context boundaries
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

/**
 * Loads and parses JSON configuration maps safely.
 */
function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

/**
 * Transforms relative markdown link text into absolute URLs.
 */
function convertLinksToAbsolute(content, rootFiles, gitBaseUrl) {
  let updatedContent = content
  
  for (const rootFileName of rootFiles) {
    const escapedName = rootFileName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const linkRegex = new RegExp(`\\[([^\\]]+)\\]\\(([^)]*\\/)?${escapedName}\\)`, 'g')

    updatedContent = updatedContent.replace(linkRegex, (match, linkText) => {
      return `[${linkText}](${gitBaseUrl}/${rootFileName})`
    })
  }
  
  return updatedContent
}

/**
 * Performs an atomic file write using a hidden temporary swap file.
 */
function atomicWriteFile(destinationPath, content, fileName) {
  const tempSwapPath = path.join(process.cwd(), `.${fileName}.${Date.now()}.tmp`)
  fs.writeFileSync(tempSwapPath, content, 'utf-8')

  try {
    fs.renameSync(tempSwapPath, destinationPath)
  } catch (error) {
    if (fs.existsSync(tempSwapPath)) fs.unlinkSync(tempSwapPath)
    throw error
  }
}

/**
 * Processes a pristine source document and compiles the official output file.
 */
function compileReleaseDocument(outputFileName, rootFilesToConvert, gitBaseUrl) {
  // Always read from your untouchable local source asset
  const sourceFileName = `${path.basename(outputFileName, path.extname(outputFileName))}.source.md`
  const sourcePath = path.join(process.cwd(), sourceFileName)
  
  if (!fs.existsSync(sourcePath)) return

  const originalContent = fs.readFileSync(sourcePath, 'utf-8')

  // Compute the transformed text state
  const processedContent = convertLinksToAbsolute(originalContent, rootFilesToConvert, gitBaseUrl)

  // Define the target location npm expects (e.g., README.md)
  const destinationPath = path.join(process.cwd(), outputFileName)

  // Write the file safely using the atomic write sequence
  atomicWriteFile(destinationPath, processedContent, outputFileName)
  
  console.log(`Successfully compiled official ${outputFileName} for registry distribution.`)
}

/**
 * Core Orchestrator Execution Loop
 */
function run() {
  const releaseConfig = loadJsonFile(path.join(rootDir, '.schloss.release.json'))
  const localPackageJson = loadJsonFile(path.join(process.cwd(), 'package.json'))
  
  const targetSettings = localPackageJson?.schloss?.release?.files
  if (!releaseConfig || !targetSettings) process.exit(0)

  for (const [outputFileName, rootFilesToConvert] of Object.entries(targetSettings)) {
    compileReleaseDocument(outputFileName, rootFilesToConvert, releaseConfig.gitBaseUrl)
  }
}

// Fire the pipeline
run()

